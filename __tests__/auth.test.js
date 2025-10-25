const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");

// Mock mongoose before requiring models
const mongoose = require("mongoose");
jest.mock("mongoose", () => ({
  connect: jest.fn(),
  connection: {
    on: jest.fn(),
    once: jest.fn(),
  },
  model: jest.fn(),
  Schema: jest.fn(),
}));

// Mock the models with proper discriminator behavior
const mockUser = {
  findOne: jest.fn(),
  create: jest.fn(),
  discriminator: jest.fn(),
};

const mockCustomer = {
  create: jest.fn(),
};

const mockPharmacy = {
  create: jest.fn(),
};

// Mock the model files
jest.mock("../models/user.model", () => mockUser);
jest.mock("../models/customer.model", () => mockCustomer);
jest.mock("../models/pharmacy.model", () => mockPharmacy);

// Mock middleware
jest.mock("../middleware/auth.middleware", () => (req, res, next) => {
    req.user = { role: "admin", email: "admin@test.com" };
    next();
});
jest.mock("../middleware/role.middleware", () => (role) => (req, res, next) => {
    if (req.user && req.user.role === role) {
        next();
    } else {
        res.status(403).json({ message: "Access denied" });
    }
});

const User = require("../models/user.model");
const Customer = require("../models/customer.model");
const Pharmacy = require("../models/pharmacy.model");

const authRoutes = require("../routes/auth.route");
const STATUS_CODES = require("../utilities/response.codes.util");

// Setup express app for testing
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);

describe("Auth Integration Tests (Comprehensive)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /api/auth/signup", () => {
        // Customer Registration Tests
        it("should register a new customer successfully", async () => {
            User.findOne.mockResolvedValue(null);
            Customer.create.mockResolvedValue({
                _id: "customer123",
                fullName: "Test Customer",
                email: "customer@test.com",
                role: "customer",
                phone: "+201000000001",
                location: { latitude: 30, longitude: 31 },
                toObject: () => ({
                    _id: "customer123",
                    fullName: "Test Customer",
                    email: "customer@test.com",
                    role: "customer",
                    phone: "+201000000001",
                    location: { latitude: 30, longitude: 31 }
                }),
            });

            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    fullName: "Test Customer",
                    email: "customer@test.com",
                    password: "12345678",
                    phone: "+201000000001",
                    role: "customer",
                    location: { latitude: 30, longitude: 31 },
                });

            expect(res.statusCode).toBe(STATUS_CODES.CREATED);
            expect(res.body.data).toHaveProperty("token");
            expect(res.body.data.user.role).toBe("customer");
            expect(res.body.data.user.fullName).toBe("Test Customer");
            expect(res.body.data.user.email).toBe("customer@test.com");
        });

        // Pharmacy Registration Tests
        it("should register a new pharmacy successfully", async () => {
            User.findOne.mockResolvedValue(null);
            Pharmacy.create.mockResolvedValue({
                _id: "pharmacy123",
                fullName: "Pharmacy Owner",
                email: "pharmacy@test.com",
                role: "pharmacy",
                phone: "+201000000002",
                location: { latitude: 30.1, longitude: 31.1 },
                pharmacyName: "Test Pharmacy",
                licenseNumber: "LIC123456",
                pharmacyLicensePhoto: "license.jpg",
                ownerIdFront: "front.jpg",
                ownerIdBack: "back.jpg",
                toObject: () => ({
                    _id: "pharmacy123",
                    fullName: "Pharmacy Owner",
                    email: "pharmacy@test.com",
                    role: "pharmacy",
                    phone: "+201000000002",
                    location: { latitude: 30.1, longitude: 31.1 },
                    pharmacyName: "Test Pharmacy",
                    licenseNumber: "LIC123456",
                    pharmacyLicensePhoto: "license.jpg",
                    ownerIdFront: "front.jpg",
                    ownerIdBack: "back.jpg",
                }),
            });

            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    fullName: "Pharmacy Owner",
                    email: "pharmacy@test.com",
                    password: "12345678",
                    phone: "+201000000002",
                    role: "pharmacy",
                    location: { latitude: 30.1, longitude: 31.1 },
                    pharmacyName: "Test Pharmacy",
                    licenseNumber: "LIC123456",
                    pharmacyLicensePhoto: "license.jpg",
                    ownerIdFront: "front.jpg",
                    ownerIdBack: "back.jpg",
                });

            expect(res.statusCode).toBe(STATUS_CODES.CREATED);
            expect(res.body.data).toHaveProperty("token");
            expect(res.body.data.user.role).toBe("pharmacy");
            expect(res.body.data.user.pharmacyName).toBe("Test Pharmacy");
            expect(res.body.data.user.licenseNumber).toBe("LIC123456");
        });

        // Validation Tests
        it("should fail registration with missing required fields for customer", async () => {
            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    email: "customer@test.com",
                    password: "12345678",
                    // missing fullName, phone, location
                });

            expect(res.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
            expect(res.body.message).toMatch(/Missing required fields/);
        });

        it("should fail registration with missing pharmacy-specific fields", async () => {
            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    fullName: "Pharmacy Owner",
                    email: "pharmacy@test.com",
                    password: "12345678",
                    phone: "+201000000002",
                    role: "pharmacy",
                    location: { latitude: 30.1, longitude: 31.1 },
                    // missing pharmacyName, licenseNumber, etc.
                });

            expect(res.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
            expect(res.body.message).toMatch(/Missing required fields/);
        });

        it("should fail registration with duplicate email", async () => {
            User.findOne.mockResolvedValue({
                _id: "existing123",
                email: "existing@test.com",
            });

            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    fullName: "Test Customer",
                    email: "existing@test.com",
                    password: "12345678",
                    phone: "+201000000003",
                    role: "customer",
                    location: { latitude: 30, longitude: 31 },
                });

            expect(res.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
            expect(res.body.message).toMatch(/Email already registered/);
        });

        it("should fail registration with invalid role", async () => {
            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    fullName: "Test User",
                    email: "user@test.com",
                    password: "12345678",
                    phone: "+201000000004",
                    role: "invalid_role",
                    location: { latitude: 30, longitude: 31 },
                });

            expect(res.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
            expect(res.body.message).toMatch(/Invalid role/);
        });

        it("should default to customer role when role is not provided", async () => {
            User.findOne.mockResolvedValue(null);
            Customer.create.mockResolvedValue({
                _id: "default123",
                fullName: "Default Customer",
                email: "default@test.com",
                role: "customer",
                phone: "+201000000005",
                location: { latitude: 30, longitude: 31 },
                toObject: () => ({
                    _id: "default123",
                    fullName: "Default Customer",
                    email: "default@test.com",
                    role: "customer",
                    phone: "+201000000005",
                    location: { latitude: 30, longitude: 31 },
                }),
            });

            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    fullName: "Default Customer",
                    email: "default@test.com",
                    password: "12345678",
                    phone: "+201000000005",
                    location: { latitude: 30, longitude: 31 },
                    // role not provided
                });

            expect(res.statusCode).toBe(STATUS_CODES.CREATED);
            expect(res.body.data.user.role).toBe("customer");
        });
    });

    describe("POST /api/auth/login", () => {
        it("should login successfully with correct credentials", async () => {
            // Create a mock user with proper method chaining
            const mockUser = {
                _id: "789",
                email: "login@test.com",
                password: "$2a$12$hashedpassword",
                correctPassword: jest.fn().mockResolvedValue(true),
                toObject: jest.fn().mockReturnValue({
                    _id: "789",
                    email: "login@test.com",
                    role: "customer",
                    fullName: "Test User",
                    phone: "+201000000006",
                    location: { latitude: 30, longitude: 31 }
                }),
            };

            // Mock the query chain: User.findOne().select()
            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findOne.mockReturnValue(mockQuery);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "login@test.com", password: "12345678" });

            expect(res.statusCode).toBe(STATUS_CODES.OK);
            expect(res.body.data).toHaveProperty("token");
            expect(res.body.data.user.email).toBe("login@test.com");
            expect(res.body.data.user.role).toBe("customer");
            expect(mockUser.correctPassword).toHaveBeenCalledWith("12345678", mockUser.password);
        });

        it("should fail login with wrong password", async () => {
            const mockUser = {
                _id: "456",
                email: "fail@test.com",
                password: "$2a$12$hashedpassword",
                correctPassword: jest.fn().mockResolvedValue(false),
                toObject: jest.fn().mockReturnValue({
                    _id: "456",
                    email: "fail@test.com",
                    role: "customer"
                }),
            };

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findOne.mockReturnValue(mockQuery);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "fail@test.com", password: "wrongpass" });

            expect(res.statusCode).toBe(STATUS_CODES.UNAUTHORIZED);
            expect(res.body.message).toMatch(/Incorrect email or password/);
        });

        it("should fail login with non-existent email", async () => {
            const mockQuery = {
                select: jest.fn().mockResolvedValue(null)
            };
            User.findOne.mockReturnValue(mockQuery);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "nonexistent@test.com", password: "12345678" });

            expect(res.statusCode).toBe(STATUS_CODES.UNAUTHORIZED);
            expect(res.body.message).toMatch(/Incorrect email or password/);
        });

        it("should fail login with missing email", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ password: "12345678" });

            expect(res.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
            expect(res.body.message).toMatch(/Please provide email and password/);
        });

        it("should fail login with missing password", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "test@test.com" });

            expect(res.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
            expect(res.body.message).toMatch(/Please provide email and password/);
        });

        it("should login pharmacy user successfully", async () => {
            const mockPharmacy = {
                _id: "pharmacy789",
                email: "pharmacy@test.com",
                password: "$2a$12$hashedpassword",
                correctPassword: jest.fn().mockResolvedValue(true),
                toObject: jest.fn().mockReturnValue({
                    _id: "pharmacy789",
                    email: "pharmacy@test.com",
                    role: "pharmacy",
                    fullName: "Pharmacy Owner",
                    phone: "+201000000007",
                    location: { latitude: 30.1, longitude: 31.1 },
                    pharmacyName: "Test Pharmacy",
                    licenseNumber: "LIC789",
                }),
            };

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockPharmacy)
            };
            User.findOne.mockReturnValue(mockQuery);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "pharmacy@test.com", password: "12345678" });

            expect(res.statusCode).toBe(STATUS_CODES.OK);
            expect(res.body.data.user.role).toBe("pharmacy");
            expect(res.body.data.user.pharmacyName).toBe("Test Pharmacy");
        });
    });

    describe("POST /api/auth/add-admin", () => {
        it("should create admin successfully when requested by existing admin", async () => {
            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({
                _id: "admin123",
                fullName: "New Admin",
                email: "newadmin@test.com",
                role: "admin",
                phone: "+201000000008",
                toObject: jest.fn().mockReturnValue({
                    _id: "admin123",
                    fullName: "New Admin",
                    email: "newadmin@test.com",
                    role: "admin",
                    phone: "+201000000008",
                }),
            });

            // Test the route directly
            const res = await request(app)
                .post("/api/auth/add-admin")
                .set('Authorization', 'Bearer mock-jwt-token')
                .send({
                    fullName: "New Admin",
                    email: "newadmin@test.com",
                    password: "adminpass123",
                    phone: "+201000000008",
                });

            expect(res.statusCode).toBe(STATUS_CODES.CREATED);
            expect(res.body.data).toHaveProperty("admin");
            expect(res.body.data.admin.role).toBe("admin");
        });

        it("should fail to create admin when user is not admin", async () => {
            const authController = require("../controllers/auth.controller");

            const mockReq = {
                user: { role: "customer", email: "customer@test.com" },
                body: {
                    fullName: "New Admin",
                    email: "newadmin@test.com",
                    password: "adminpass123",
                }
            };

            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const mockNext = jest.fn();

            await authController.addAdmin(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(STATUS_CODES.FORBIDDEN);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "fail",
                    message: expect.stringContaining("Access denied"),
                })
            );
        });

        it("should fail to create admin with missing required fields", async () => {
            const authController = require("../controllers/auth.controller");

            const mockReq = {
                user: { role: "admin", email: "admin@test.com" },
                body: {
                    email: "newadmin@test.com",
                    // missing fullName and password
                }
            };

            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const mockNext = jest.fn();

            await authController.addAdmin(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "fail",
                    message: expect.stringContaining("are required"),
                })
            );
        });

        it("should fail to create admin with duplicate email", async () => {
            const authController = require("../controllers/auth.controller");

            const mockReq = {
                user: { role: "admin", email: "admin@test.com" },
                body: {
                    fullName: "New Admin",
                    email: "existing@test.com",
                    password: "adminpass123",
                }
            };

            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const mockNext = jest.fn();

            User.findOne.mockResolvedValue({
                _id: "existing123",
                email: "existing@test.com",
            });

            await authController.addAdmin(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "fail",
                    message: expect.stringContaining("Admin already exists"),
                })
            );
        });
    });

    describe("Response Format and Security", () => {
        it("should not include password in response", async () => {
            User.findOne.mockResolvedValue(null);
            Customer.create.mockResolvedValue({
                _id: "secure123",
                fullName: "Secure User",
                email: "secure@test.com",
                password: "hashedpassword",
                role: "customer",
                phone: "+201000000009",
                location: { latitude: 30, longitude: 31 },
                toObject: jest.fn().mockReturnValue({
                    _id: "secure123",
                    fullName: "Secure User",
                    email: "secure@test.com",
                    password: "hashedpassword",
                    role: "customer",
                    phone: "+201000000009",
                    location: { latitude: 30, longitude: 31 },
                }),
            });

            const res = await request(app)
                .post("/api/auth/signup")
                .send({
                    fullName: "Secure User",
                    email: "secure@test.com",
                    password: "12345678",
                    phone: "+201000000009",
                    role: "customer",
                    location: { latitude: 30, longitude: 31 },
                });

            expect(res.statusCode).toBe(STATUS_CODES.CREATED);
            expect(res.body.data.user.password).toBeUndefined();
            expect(res.body.data.user.__v).toBeUndefined();
            expect(res.body.data.user.createdAt).toBeUndefined();
            expect(res.body.data.user.updatedAt).toBeUndefined();
        });

        it("should set httpOnly cookie with JWT token", async () => {
            const mockUser = {
                _id: "cookie123",
                email: "cookie@test.com",
                password: "$2a$12$hashedpassword",
                correctPassword: jest.fn().mockResolvedValue(true),
                toObject: jest.fn().mockReturnValue({
                    _id: "cookie123",
                    email: "cookie@test.com",
                    role: "customer",
                    fullName: "Cookie User",
                    phone: "+201000000010",
                    location: { latitude: 30, longitude: 31 },
                }),
            };

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findOne.mockReturnValue(mockQuery);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "cookie@test.com", password: "12345678" });

            expect(res.statusCode).toBe(STATUS_CODES.OK);

            // Check if cookie is set
            const cookie = res.headers['set-cookie'];
            expect(cookie).toBeDefined();
            expect(cookie[0]).toMatch(/jwt=/);
            expect(cookie[0]).toMatch(/HttpOnly/);
            expect(cookie[0]).toMatch(/SameSite=Strict/);
        });
    });
});