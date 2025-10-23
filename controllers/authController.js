const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utilities/app.error.util");
const User = require("../models/UserModel");

// create JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const accessToken = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  const accessCookieOptions = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  };

  // Refresh Token Cookie
  const refreshCookieOptions = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN?.replace("d", "")) *
          24 *
          60 *
          60 *
          1000
    ),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  };

  // Send cookies
  res.cookie("jwt", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  // Remove password from output
  user.password = undefined;

  // Send response
  res.status(statusCode).json({
    status: "success",
    accessToken,
    refreshToken,
    data: { user },
  });
};

exports.signUp = async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, res);
};

exports.protect = async (req, res, next) => {
  let token;

  // Get token from header or cookie
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  // Check if password changed after token issue
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  req.user = currentUser;
  next();
};
