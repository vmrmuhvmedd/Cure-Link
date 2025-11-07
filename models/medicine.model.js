const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const medicineSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Medicine name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Medicine description is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Medicine price is required'],
        min: [0, 'Price cannot be negative']
    },
    quantity: {
        type: Number,
        required: [true, 'Medicine quantity is required'],
        min: [1, 'Quantity must be at least 1'],
        validate: {
            validator: function(value) {
                return Number.isInteger(value) && value > 0;
            },
            message: 'Quantity must be a positive whole number (1, 2, 3, etc.) - decimals like 0.1, 0.2 are not allowed'
        }
    },
    image: {
        type: String,
        required: [true, 'Medicine image is required'],
        trim: true
    },
    pharmacyId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Pharmacy ID is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Medicine', medicineSchema);