const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please provide your full name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
    },
    photo: {
      type: String,
      default: "default.jpg",
    },
    role: {
      type: String,
      enum: ["customer", "pharmacy", "admin"],
      default: "customer",
    },
    password: {
      type: String,
      required: [true, "A user must have a password"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    phone: {
      type: String,
      required: [true, "Please provide your phone number"],
      unique: true,
      trim: true,
    },
  },
  { discriminatorKey: "kind", timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
