const mongoose = require("mongoose");
const User = require("./user.model");

const pharmacySchema = new mongoose.Schema({
  pharmacyName: {
    type: String,
    required: [true, "Pharmacy name is required"],
  },
  licenseNumber: {
    type: String,
    required: [true, "License number is required"],
  },
  pharmacyLicensePhoto: {
    type: String,
    required: [true, "Pharmacy license photo is required"],
  },
  ownerIdFront: {
    type: String,
    required: [true, "Owner ID front image is required"],
  },
  ownerIdBack: {
    type: String,
    required: [true, "Owner ID back image is required"],
  },
  location: {
    latitude: {
      type: Number,
      required: [true, "Please provide latitude"],
    },
    longitude: {
      type: Number,
      required: [true, "Please provide longitude"],
    },
  },
});

const Pharmacy = User.discriminator("Pharmacy", pharmacySchema);
module.exports = Pharmacy;
