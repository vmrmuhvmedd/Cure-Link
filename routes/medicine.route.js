const express = require("express");
const router = express.Router();
const Medicine = require('../models/medicine.model');
const upload = require('../middleware/upload.middleware');
const authorize = require("../middleware/role.middleware");
const authenticate = require("../middleware/auth.middleware");
const medicineController = require('../controllers/medicine.controller');
const paginate = require('../middleware/paginate.middleware');
const search = require('../middleware/search.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Medicine:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - quantity
 *         - image
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the medicine
 *         name:
 *           type: string
 *           description: The name of the medicine
 *         description:
 *           type: string
 *           description: The description of the medicine
 *         price:
 *           type: number
 *           minimum: 0
 *           description: The price of the medicine
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: The quantity available (must be whole number)
 *         image:
 *           type: string
 *           description: URL or path to the medicine image
 *         pharmacyId:
 *           oneOf:
 *             - type: string
 *               description: ID of the pharmacy (when not populated)
 *             - type: object
 *               description: Pharmacy details (when populated)
 *               properties:
 *                 _id:
 *                   type: string
 *                 pharmacyName:
 *                   type: string
 *                 location:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *         distance:
 *           type: number
 *           format: float
 *           description: Distance from user in kilometers (only included if latitude/longitude provided)
 *         isActive:
 *           type: boolean
 *           description: Whether the medicine is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "507f1f77bcf86cd799439011"
 *         name: "Paracetamol 500mg"
 *         description: "Pain reliever and fever reducer"
 *         price: 15.99
 *         quantity: 100
 *         image: "uploads/products/paracetamol.jpg"
 *         isActive: true
 *         createdAt: "2023-10-01T12:00:00.000Z"
 *         updatedAt: "2023-10-01T12:00:00.000Z"
 * 
 *     MedicineInput:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - quantity
 *       properties:
 *         name:
 *           type: string
 *           description: Medicine name
 *         description:
 *           type: string
 *           description: Medicine description
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Medicine price
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity available (must be a whole number)
 *         image:
 *           type: string
 *           format: binary
 *           description: Medicine image file (jpg, jpeg, png, max 5MB)
 */

/**
 * @swagger
 * tags:
 *   name: Medicines
 *   description: Medicine management API
 */

/**
 * @swagger
 * /api/medicines:
 *   get:
 *     summary: Get all active medicines (with pagination and search)
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search medicines by name or description (case-insensitive)
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User's latitude for geolocation search (returns closest pharmacies first). If authenticated user has location, it will be used automatically.
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User's longitude for geolocation search (returns closest pharmacies first). If authenticated user has location, it will be used automatically.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name, price, quantity]
 *           default: createdAt
 *         description: Field to sort by (ignored if latitude/longitude provided - will sort by distance instead)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ignored if latitude/longitude provided - always sorts by distance ascending)
 *     responses:
 *       200:
 *         description: List of active medicines with pagination. Each medicine includes distance (in km) if latitude/longitude provided.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicineListResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Medicines retrieved successfully"
 *                   data:
 *                     count: 2
 *                     medicines:
 *                       - _id: "507f1f77bcf86cd799439011"
 *                         name: "Paracetamol 500mg"
 *                         description: "Pain reliever"
 *                         price: 15.99
 *                         quantity: 100
 *                         image: "uploads/products/paracetamol.jpg"
 *                         isActive: true
 *                     pagination:
 *                       currentPage: 1
 *                       totalPages: 1
 *                       totalItems: 2
 *                       itemsPerPage: 10
 *                       hasNextPage: false
 *                       hasPrevPage: false
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', 
    authenticate.optional, 
    (req, res, next) => {
        req.baseQuery = Medicine.find({ isActive: true });
        next();
    },
    search(Medicine),
    paginate(Medicine), 
    medicineController.getAllMedicines
);

/**
 * @swagger
 * /api/medicines/{id}:
 *   get:
 *     summary: Get medicine by ID
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Medicine ID
 *     responses:
 *       200:
 *         description: Medicine data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Medicine retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Medicine'
 *       404:
 *         description: Medicine not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Medicine not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate.optional, medicineController.getMedicineById);

/**
 * @swagger
 * /api/medicines:
 *   post:
 *     summary: Create a new medicine (Pharmacy only)
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - quantity
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *                 description: Medicine name
 *                 example: "Paracetamol 500mg"
 *               description:
 *                 type: string
 *                 description: Medicine description
 *                 example: "Pain reliever and fever reducer"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Medicine price
 *                 example: 15.99
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity available (must be a positive whole number)
 *                 example: 100
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Medicine image file (jpg, jpeg, png, max 5MB)
 *     responses:
 *       201:
 *         description: Medicine created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Medicine created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Medicine'
 *       400:
 *         description: Validation error (e.g., invalid quantity, missing fields, invalid image)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidQuantity:
 *                 value:
 *                   success: false
 *                   message: "Quantity must be a positive whole number (1, 2, 3, etc.)"
 *               missingFields:
 *                 value:
 *                   success: false
 *                   message: "Missing required fields: name, description, price, quantity, and image are required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (Pharmacy role required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/',
    authenticate,
    authorize(['pharmacy']),
    upload.single('image'),
    medicineController.createMedicine
);

/**
 * @swagger
 * /api/medicines/{id}:
 *   put:
 *     summary: Update medicine (Pharmacy only)
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Medicine ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Medicine name (optional)
 *                 example: "Updated Medicine Name"
 *               description:
 *                 type: string
 *                 description: Medicine description (optional)
 *                 example: "Updated description"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Medicine price (optional)
 *                 example: 20.99
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity available - must be a positive whole number (optional)
 *                 example: 150
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New medicine image file (jpg, jpeg, png, max 5MB) - optional
 *     responses:
 *       200:
 *         description: Medicine updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Medicine updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Medicine'
 *       400:
 *         description: Validation error (e.g., invalid quantity)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Quantity must be a positive whole number (1, 2, 3, etc.)"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (Pharmacy role required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Medicine not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Medicine not found"
 */
router.put(
    '/:id',
    authenticate,
    authorize(['pharmacy']),
    upload.single('image'),
    medicineController.updateMedicine
);

/**
 * @swagger
 * /api/medicines/pharmacy/all:
 *   get:
 *     summary: Get all medicines for pharmacy (including inactive) with pagination and search
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search medicines by name or description (case-insensitive)
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User's latitude for geolocation search (returns closest pharmacies first)
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User's longitude for geolocation search (returns closest pharmacies first)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name, price, quantity]
 *           default: createdAt
 *         description: Field to sort by (ignored if latitude/longitude provided)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ignored if latitude/longitude provided)
 *     responses:
 *       200:
 *         description: List of all medicines (active and inactive) with pagination. Each medicine includes distance (in km) if latitude/longitude provided.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicineListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (Pharmacy role required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    '/pharmacy/all',
    authenticate,
    authorize(['pharmacy']),
    (req, res, next) => {
        req.baseQuery = Medicine.find();
        next();
    },
    search(Medicine),
    paginate(Medicine),
    medicineController.getAllMedicinesPharmacy
);

/**
 * @swagger
 * /api/medicines/{id}/deactivate:
 *   patch:
 *     summary: Deactivate medicine (soft delete) - Pharmacy only
 *     description: Deactivates a medicine by setting isActive to false. This is a soft delete operation.
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Medicine ID
 *     responses:
 *       200:
 *         description: Medicine deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Medicine deactivated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Medicine'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (Pharmacy role required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Medicine not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Medicine not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
    '/:id/deactivate',
    authenticate,
    authorize(['pharmacy']),
    medicineController.deactivateMedicine
);

/**
 * @swagger
 * /api/medicines/{id}/activate:
 *   patch:
 *     summary: Activate medicine - Pharmacy only
 *     description: Activates a previously deactivated medicine by setting isActive to true.
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Medicine ID
 *     responses:
 *       200:
 *         description: Medicine activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Medicine activated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Medicine'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (Pharmacy role required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Medicine not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Medicine not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
    '/:id/activate',
    authenticate,
    authorize(['pharmacy']),
    medicineController.activateMedicine
);

module.exports = router;