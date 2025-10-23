const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "please provide your name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "please provide your email"],
    unique: true,
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "pharmacy", "admin"],
  },
  password: {
    type: String,
    required: [true, "A user must have a password"],
    minlength: [8, "Password must be at least 8 characters long"],
    select: false,
  },
});

// encrypt password before saving to database using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// instance method to check if the password is correct
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
