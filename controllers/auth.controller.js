const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Customer = require("../models/customer.model");
const Pharmacy = require("../models/pharmacy.model");
const logger = require("../utilities/logger.util");
const { sendSuccess, sendFail } = require("../utilities/response.util");
const STATUS_CODES = require("../utilities/response.codes.util");
const catchAsyncUtil = require("../utilities/catch.async.util");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const createSendToken = async (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("jwt", token, cookieOptions);

  const userObj =
    typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete userObj.password;
  delete userObj.__v;
  delete userObj.createdAt;
  delete userObj.updatedAt;

  let publicUser = {
    _id: userObj._id,
    fullName: userObj.fullName,
    email: userObj.email,
    photo: userObj.photo,
    role: userObj.role,
    phone: userObj.phone,
    location: userObj.location || null,
  };

  if (userObj.role === "pharmacy") {
    publicUser = {
      ...publicUser,
      pharmacyName: userObj.pharmacyName,
      licenseNumber: userObj.licenseNumber,
      pharmacyLicensePhoto: userObj.pharmacyLicensePhoto,
      ownerIdFront: userObj.ownerIdFront,
      ownerIdBack: userObj.ownerIdBack,
    };
  }

  Object.keys(publicUser).forEach(
    (key) => publicUser[key] == null && delete publicUser[key]
  );

  return sendSuccess(
    res,
    { token, user: publicUser },
    "Authentication successful",
    statusCode
  );
};

exports.signUp = catchAsyncUtil(async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    role,
    location,
    pharmacyName,
    licenseNumber,
    pharmacyLicensePhoto,
    ownerIdFront,
    ownerIdBack,
  } = req.body;

  const allowedRoles = ["customer", "pharmacy"];
  const signupRole = role || "customer";

  if (!allowedRoles.includes(signupRole)) {
    logger.warn(`SignUp | Invalid role: ${signupRole}`);
    return sendFail(
      res,
      { role: `Allowed roles: ${allowedRoles.join(", ")}` },
      "Invalid role. Allowed roles are: customer, pharmacy",
      STATUS_CODES.BAD_REQUEST
    );
  }

  const missing = [];
  if (!fullName) missing.push("fullName");
  if (!email) missing.push("email");
  if (!password) missing.push("password");
  if (!phone) missing.push("phone");
  if (!location) missing.push("location");

  if (signupRole === "pharmacy") {
    if (!pharmacyName) missing.push("pharmacyName");
    if (!licenseNumber) missing.push("licenseNumber");
    if (!pharmacyLicensePhoto) missing.push("pharmacyLicensePhoto");
    if (!ownerIdFront) missing.push("ownerIdFront");
    if (!ownerIdBack) missing.push("ownerIdBack");
  }

  if (missing.length > 0) {
    const details = {};
    missing.forEach((f) => (details[f] = `${f} is required`));
    logger.warn(`SignUp | Missing fields: ${missing.join(", ")}`);
    return sendFail(
      res,
      details,
      `Missing required fields: ${missing.join(", ")}`,
      STATUS_CODES.BAD_REQUEST
    );
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn(`SignUp | Email already exists | ${email}`);
    return sendFail(
      res,
      { email: "Email already exists" },
      "Email already registered",
      STATUS_CODES.BAD_REQUEST
    );
  }

  let newUser;
  if (signupRole === "customer") {
    newUser = await Customer.create({
      fullName,
      email,
      password,
      phone,
      location,
      role: signupRole,
    });
  } else if (signupRole === "pharmacy") {
    newUser = await Pharmacy.create({
      fullName,
      email,
      password,
      phone,
      location,
      pharmacyName,
      licenseNumber,
      pharmacyLicensePhoto,
      ownerIdFront,
      ownerIdBack,
      role: signupRole,
    });
  }

  logger.info(`SignUp | New user created | ${signupRole} | ${email}`);
  return createSendToken(newUser, STATUS_CODES.CREATED, res);
});

exports.login = catchAsyncUtil(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn("Login | Missing email or password");
    return sendFail(
      res,
      {},
      "Please provide email and password",
      STATUS_CODES.BAD_REQUEST
    );
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    logger.warn(`Login | Invalid credentials | ${email}`);
    return sendFail(
      res,
      {},
      "Incorrect email or password",
      STATUS_CODES.UNAUTHORIZED
    );
  }

  logger.info(`Login | Success | ${email}`);
  return createSendToken(user, STATUS_CODES.OK, res);
});

exports.addAdmin = catchAsyncUtil(async (req, res) => {
  const { fullName, email, password, phone, photo } = req.body;

  if (!req.user || req.user.role !== "admin") {
    logger.warn(
      `AddAdmin | Unauthorized attempt by ${
        req.user ? req.user.email : "unknown"
      }`
    );
    return sendFail(
      res,
      {},
      "Access denied: You don't have permission to perform this action.",
      STATUS_CODES.FORBIDDEN
    );
  }

  const missing = [];
  if (!fullName) missing.push("fullName");
  if (!email) missing.push("email");
  if (!password) missing.push("password");

  if (missing.length > 0) {
    const details = {};
    missing.forEach((f) => (details[f] = `${f} is required`));
    logger.warn(`AddAdmin | Missing required fields: ${missing.join(", ")}`);
    return sendFail(
      res,
      details,
      `${missing.join(", ")} are required to create an admin`,
      STATUS_CODES.BAD_REQUEST
    );
  }

  const existing = await User.findOne({ email });
  if (existing) {
    logger.warn(`AddAdmin | Email already in use | ${email}`);
    return sendFail(
      res,
      { email: "Email already exists" },
      "Admin already exists with this email",
      STATUS_CODES.BAD_REQUEST
    );
  }

  const admin = await User.create({
    fullName,
    email,
    password,
    role: "admin",
    phone,
    photo,
  });

  const adminObj =
    typeof admin.toObject === "function" ? admin.toObject() : { ...admin };
  delete adminObj.password;
  delete adminObj.__v;
  delete adminObj.createdAt;
  delete adminObj.updatedAt;

  logger.info(`AddAdmin | New admin created | ${email}`);
  return sendSuccess(
    res,
    { admin: adminObj },
    "Admin created successfully",
    STATUS_CODES.CREATED
  );
});
