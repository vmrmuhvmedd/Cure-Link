const Medicine = require('../models/medicine.model');
const logger = require("../utilities/logger.util");
const { sendSuccess, sendFail } = require("../utilities/response.util");
const STATUS_CODES = require("../utilities/response.codes.util");
const catchAsyncUtil = require("../utilities/catch.async.util");

const createMedicine = catchAsyncUtil(async (req, res) => {
    const { name, description, price, quantity } = req.body;
    
    const image = req.file ? req.file.path : req.body.image;
    
    // Get pharmacy ID from authenticated user (from token)
    if (!req.user || req.user.role !== 'pharmacy') {
        logger.warn('Unauthorized: Only pharmacies can create medicines');
        return sendFail(
            res,
            { role: 'Only pharmacies can create medicines' },
            'Unauthorized: Only pharmacies can create medicines',
            STATUS_CODES.FORBIDDEN
        );
    }

    if (!name || !description || !price || !quantity) {
        logger.warn('Missing required fields in medicine creation');
        return sendFail(
            res,
            { fields: 'Missing required fields: name, description, price, quantity, and image are required' },
            'Missing required fields: name, description, price, quantity, and image are required',
            STATUS_CODES.BAD_REQUEST
        );
    }

    if (!image) {
        logger.warn('Image is required for medicine creation');
        return sendFail(
            res,
            { image: 'Image is required' },
            'Image is required',
            STATUS_CODES.BAD_REQUEST
        );
    }

    // Validate quantity is a positive integer
    const quantityNum = Number(quantity);
    if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
        logger.warn(`Invalid quantity attempted: ${quantity}`);
        return sendFail(
            res,
            { quantity: 'Quantity must be a positive whole number (1, 2, 3, etc.)' },
            'Quantity must be a positive whole number (1, 2, 3, etc.)',
            STATUS_CODES.BAD_REQUEST
        );
    }

    const medicine = await Medicine.create({
        name,
        description,
        price,
        quantity: quantityNum,
        image,
        pharmacyId: req.user._id,
        isActive: true
    });
    
    logger.info(`Medicine created: ${medicine._id} for pharmacy: ${req.user._id}`);
    return sendSuccess(
        res,
        medicine,
        'Medicine created successfully',
        STATUS_CODES.CREATED
    );
});

const getAllMedicines = catchAsyncUtil(async (req, res) => {
    // Use pagination data if available, otherwise fallback to direct query
    if (req.pagination) {
        const { data: medicines, pagination } = req.pagination;
        
        logger.info(`Retrieved ${medicines.length} active medicines (page ${pagination.currentPage})`);
        return sendSuccess(
            res,
            {
                count: medicines.length,
                medicines,
                pagination
            },
            'Medicines retrieved successfully',
            STATUS_CODES.OK
        );
    } else {
        // Fallback for non-paginated requests
        const medicines = await Medicine.find({ isActive: true });
        
        logger.info(`Retrieved ${medicines.length} active medicines`);
        return sendSuccess(
            res,
            {
                count: medicines.length,
                medicines
            },
            'Medicines retrieved successfully',
            STATUS_CODES.OK
        );
    }
});

const getAllMedicinesPharmacy = catchAsyncUtil(async (req, res) => {
    // Use pagination data if available, otherwise fallback to direct query
    if (req.pagination) {
        const { data: medicines, pagination } = req.pagination;
        
        logger.info(`Retrieved ${medicines.length} medicines for pharmacy (page ${pagination.currentPage})`);
        return sendSuccess(
            res,
            {
                count: medicines.length,
                medicines,
                pagination
            },
            'Medicines retrieved successfully',
            STATUS_CODES.OK
        );
    } else {
        // Fallback for non-paginated requests
        const medicines = await Medicine.find();
        
        logger.info(`Retrieved ${medicines.length} medicines for pharmacy`);
        return sendSuccess(
            res,
            {
                count: medicines.length,
                medicines
            },
            'Medicines retrieved successfully',
            STATUS_CODES.OK
        );
    }
});

const getMedicineById = catchAsyncUtil(async (req, res) => {
    const medicine = await Medicine.findOne({ 
        _id: req.params.id, 
        isActive: true 
    });

    if (!medicine) {
        logger.warn(`Medicine not found: ${req.params.id}`);
        return sendFail(
            res,
            {},
            'Medicine not found',
            STATUS_CODES.NOT_FOUND
        );
    }

    logger.info(`Medicine retrieved: ${medicine._id}`);
    return sendSuccess(
        res,
        medicine,
        'Medicine retrieved successfully',
        STATUS_CODES.OK
    );
});

const updateMedicine = catchAsyncUtil(async (req, res) => {
    const { quantity, ...updateData } = req.body;
    
    // Handle file upload - if new image is uploaded, use it
    if (req.file) {
        updateData.image = req.file.path;
    }

    // Validate quantity if provided
    if (quantity !== undefined) {
        const quantityNum = Number(quantity);
        if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
            logger.warn(`Invalid quantity attempted in update: ${quantity}`);
            return sendFail(
                res,
                { quantity: 'Quantity must be a positive whole number (1, 2, 3, etc.)' },
                'Quantity must be a positive whole number (1, 2, 3, etc.)',
                STATUS_CODES.BAD_REQUEST
            );
        }
        updateData.quantity = quantityNum;
    }

    const medicine = await Medicine.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    if (!medicine) {
        logger.warn(`Medicine not found for update: ${req.params.id}`);
        return sendFail(
            res,
            {},
            'Medicine not found',
            STATUS_CODES.NOT_FOUND
        );
    }

    logger.info(`Medicine updated: ${medicine._id}`);
    return sendSuccess(
        res,
        medicine,
        'Medicine updated successfully',
        STATUS_CODES.OK
    );
});

const deactivateMedicine = catchAsyncUtil(async (req, res) => {
    const medicine = await Medicine.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
    );

    if (!medicine) {
        logger.warn(`Medicine not found for deactivation: ${req.params.id}`);
        return sendFail(
            res,
            {},
            'Medicine not found',
            STATUS_CODES.NOT_FOUND
        );
    }

    logger.info(`Medicine deactivated: ${medicine._id}`);
    return sendSuccess(
        res,
        medicine,
        'Medicine deactivated successfully',
        STATUS_CODES.OK
    );
});

const activateMedicine = catchAsyncUtil(async (req, res) => {
    const medicine = await Medicine.findByIdAndUpdate(
        req.params.id,
        { isActive: true },
        { new: true }
    );

    if (!medicine) {
        logger.warn(`Medicine not found for activation: ${req.params.id}`);
        return sendFail(
            res,
            {},
            'Medicine not found',
            STATUS_CODES.NOT_FOUND
        );
    }

    logger.info(`Medicine activated: ${medicine._id}`);
    return sendSuccess(
        res,
        medicine,
        'Medicine activated successfully',
        STATUS_CODES.OK
    );
});

module.exports = {
    createMedicine,
    getAllMedicines,
    getAllMedicinesPharmacy,
    getMedicineById,
    updateMedicine,
    deactivateMedicine,
    activateMedicine,
};