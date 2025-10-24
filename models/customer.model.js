const mongoose = require("mongoose");
const User = require("./user.model");

const customerSchema = new mongoose.Schema({
  location: {
    latitude: {
      type: Number,
      required: [true, "Please provide latitude"],
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    longitude: {
      type: Number,
      required: [true, "Please provide longitude"],
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
  },
});

const Customer = User.discriminator("Customer", customerSchema);
module.exports = Customer;
