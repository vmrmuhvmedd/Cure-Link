const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const authController = require("../controllers/auth.controller");

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: APIs for user, pharmacy, and admin authentication
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *         - phone
 *         - role
 *         - location
 *       properties:
 *         fullName:
 *           type: string
 *           example: Ahmed Ali
 *         email:
 *           type: string
 *           example: ahmed@example.com
 *         password:
 *           type: string
 *           example: StrongPass123
 *         phone:
 *           type: string
 *           example: "+201001234567"
 *         role:
 *           type: string
 *           enum: [customer]
 *           example: customer
 *         location:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *           properties:
 *             latitude:
 *               type: number
 *               example: 30.0444
 *             longitude:
 *               type: number
 *               example: 31.2357
 *
 *     Pharmacy:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *         - phone
 *         - role
 *         - pharmacyName
 *         - licenseNumber
 *         - pharmacyLicensePhoto
 *         - ownerIdFront
 *         - ownerIdBack
 *         - location
 *       properties:
 *         fullName:
 *           type: string
 *           example: Pharmacy Owner
 *         email:
 *           type: string
 *           example: owner@pharmacy.com
 *         password:
 *           type: string
 *           example: PharmaPass123
 *         phone:
 *           type: string
 *           example: "+201223456789"
 *         role:
 *           type: string
 *           enum: [pharmacy]
 *           example: pharmacy
 *         pharmacyName:
 *           type: string
 *           example: El-Salam Pharmacy
 *         licenseNumber:
 *           type: string
 *           example: LIC123456
 *         pharmacyLicensePhoto:
 *           type: string
 *           example: uploads/license.jpg
 *         ownerIdFront:
 *           type: string
 *           example: uploads/id_front.jpg
 *         ownerIdBack:
 *           type: string
 *           example: uploads/id_back.jpg
 *         location:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *           properties:
 *             latitude:
 *               type: number
 *               example: 29.9765
 *             longitude:
 *               type: number
 *               example: 31.1313
 *
 *     Admin:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *         - phone
 *         - role
 *       properties:
 *         fullName:
 *           type: string
 *           example: System Admin
 *         email:
 *           type: string
 *           example: admin@example.com
 *         password:
 *           type: string
 *           example: AdminPass123
 *         phone:
 *           type: string
 *           example: "+201234567890"
 *         role:
 *           type: string
 *           enum: [admin]
 *           example: admin
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user (customer, pharmacy, or admin)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Customer'
 *               - $ref: '#/components/schemas/Pharmacy'
 *               - $ref: '#/components/schemas/Admin'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post("/signup", authController.signUp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user or pharmacy and return JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: MyStrongPass123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/add-admin:
 *   post:
 *     summary: Create a new admin account (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Admin User
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: AdminPass123
 *               phone:
 *                 type: string
 *                 example: "+201234567890"
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       403:
 *         description: Unauthorized (Not an admin)
 */
router.post(
  "/add-admin",
  authenticate,
  authorize("admin"),
  authController.addAdmin
);

module.exports = router;
