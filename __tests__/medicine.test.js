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
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => id || '507f1f77bcf86cd799439011')
  }
}));

// Mock the Medicine model
const mockMedicine = {
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

jest.mock("../models/medicine.model", () => mockMedicine);

// Mock middleware - create a mutable object for testing
const authMiddlewareMock = {
  _userRole: "pharmacy",
  _userEmail: "pharmacy@test.com",
  
  setUserRole: function(role, email) {
    this._userRole = role;
    this._userEmail = email || `${role}@test.com`;
  },
  
  reset: function() {
    this._userRole = "pharmacy";
    this._userEmail = "pharmacy@test.com";
  }
};

const authMiddleware = (req, res, next) => {
  req.user = { role: authMiddlewareMock._userRole, email: authMiddlewareMock._userEmail };
  next();
};

authMiddleware.optional = (req, res, next) => {
  req.user = { role: "customer", email: "customer@test.com" };
  next();
};

authMiddleware.required = (req, res, next) => {
  req.user = { role: authMiddlewareMock._userRole, email: authMiddlewareMock._userEmail };
  next();
};

// Store the mock object so tests can modify it
authMiddleware._mock = authMiddlewareMock;

jest.mock("../middleware/auth.middleware", () => authMiddleware);

jest.mock("../middleware/role.middleware", () => (roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: "Access denied" });
  }
});

jest.mock("../middleware/upload.middleware", () => {
  const multer = require('multer');
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
  });
  
  return {
    single: () => (req, res, next) => {
      // Use real multer to parse multipart, then add path property
      upload.single('image')(req, res, (err) => {
        if (err) return next(err);
        // Add path property that controller expects
        if (req.file) {
          req.file.path = 'uploads/products/test-image.jpg';
        }
        next();
      });
    }
  };
});

jest.mock("../middleware/search.middleware", () => (model) => async (req, res, next) => {
  try {
    // Get filter from baseQuery if exists
    let filter = {};
    if (req.baseQuery && typeof req.baseQuery.getFilter === 'function') {
      filter = req.baseQuery.getFilter();
    }
    
    // Text search
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter = {
        ...filter,
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      };
    }
    
    // Execute the search query
    const findQuery = model.find(filter);
    let data = [];
    if (findQuery && typeof findQuery.exec === 'function') {
      data = await findQuery.exec();
    }
    
    // Store search results
    req.searchResults = data;
    req.baseQuery = model.find(Object.keys(filter).length > 0 ? filter : {});
    
    next();
  } catch (err) {
    next(err);
  }
});

jest.mock("../middleware/paginate.middleware", () => (model) => async (req, res, next) => {
  // Mock pagination middleware behavior
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    let data;
    let total;

    // If search was already applied, use searchResults
    if (req.searchResults && Array.isArray(req.searchResults)) {
      const totalItems = req.searchResults.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      data = req.searchResults.slice(startIndex, endIndex);
      total = totalItems;
    } else {
      // Normal pagination without search
      let filter = {};
      if (req.baseQuery && typeof req.baseQuery.getFilter === 'function') {
        filter = req.baseQuery.getFilter();
      } else if (!req.baseQuery) {
        filter = {};
      } else {
        filter = req.baseQuery._conditions || {};
      }
      
      // Execute the query using mocked methods
      total = await model.countDocuments(filter);
      
      // Execute find query
      const findQuery = model.find(filter);
      if (findQuery && typeof findQuery.exec === 'function') {
        data = await findQuery.exec();
      } else {
        data = [];
      }
      
      // Apply pagination slicing
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      data = Array.isArray(data) ? data.slice(startIndex, endIndex) : [];
    }
    
    const totalPages = Math.ceil(total / limit);
    
    req.pagination = {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
    
    next();
  } catch (err) {
    next(err);
  }
});

// Mock utilities
jest.mock("../utilities/logger.util", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock("../utilities/responses.status.util", () => {
  const SUCCESS = (message, data) => ({
    success: true,
    message,
    ...(data !== null && data !== undefined && { data })
  });
  
  const FAIL = (message) => ({
    success: false,
    message
  });
  
  return {
    SUCCESS,
    FAIL,
    ERROR: 'error'
  };
});

jest.mock("../utilities/response.codes.util", () => ({
  OK: 200,
  SUCCESS: 200, // Alias for OK
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
}));

jest.mock("../utilities/catch.async.util", () => (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
});

const Medicine = require("../models/medicine.model");
const STATUS_CODES = require("../utilities/response.codes.util");

// Mock error handler
jest.mock("../middleware/errorHandler.middleware", () => (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({
    success: false,
    message: message
  });
});

// Setup express app for testing
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Import and use medicine routes
const medicineRoutes = require("../routes/medicine.route");
app.use("/api/medicines", medicineRoutes);

// Add error handler
const errorHandler = require("../middleware/errorHandler.middleware");
app.use(errorHandler);

describe("Medicine Integration Tests (Comprehensive)", () => {
  let pharmacyAuthToken;
  let customerAuthToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset auth middleware mock
    const authMiddleware = require("../middleware/auth.middleware");
    if (authMiddleware && authMiddleware._mock) {
      authMiddleware._mock.reset();
    }
    
    // Reset mock implementations
    Medicine.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getFilter: jest.fn().mockReturnValue({})
    });
    
    Medicine.findOne.mockResolvedValue(null);
    
    Medicine.countDocuments = jest.fn().mockResolvedValue(0);
    
    // Reset mock medicines for pagination
    delete require.cache[require.resolve('../routes/medicine.route')];
  });

  describe("GET /api/medicines (Public - Optional Auth)", () => {
    it("should return all active medicines successfully", async () => {
      const mockMedicines = [
        {
          _id: "med1",
          name: "Paracetamol 500mg",
          description: "Pain reliever",
          price: 15.99,
          quantity: 100,
          image: "paracetamol.jpg",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: "med2", 
          name: "Ibuprofen 400mg",
          description: "Anti-inflammatory",
          price: 12.50,
          quantity: 50,
          image: "ibuprofen.jpg",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      Medicine.countDocuments.mockResolvedValue(2);
      Medicine.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMedicines),
        clone: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getFilter: jest.fn().mockReturnValue({ isActive: true })
      });

      const res = await request(app)
        .get("/api/medicines")
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      expect(res.body.data.medicines).toBeDefined();
      if (res.body.data.pagination) {
        // Paginated response
        expect(res.body.data.medicines).toHaveLength(2);
        expect(res.body.data.pagination.totalItems).toBe(2);
      } else {
        // Fallback response
        expect(res.body.data.medicines).toHaveLength(2);
      }
    });

    it("should return empty array when no active medicines found", async () => {
      Medicine.countDocuments.mockResolvedValue(0);
      Medicine.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        clone: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getFilter: jest.fn().mockReturnValue({ isActive: true })
      });

      const res = await request(app)
        .get("/api/medicines")
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      if (res.body.data.pagination) {
        expect(res.body.data.medicines).toHaveLength(0);
        expect(res.body.data.pagination.totalItems).toBe(0);
      } else {
        expect(res.body.data.medicines).toHaveLength(0);
      }
    });

    it("should not return inactive medicines", async () => {
      const mockMedicines = [
        {
          _id: "med1",
          name: "Active Medicine",
          description: "Active desc",
          price: 10,
          quantity: 100,
          image: "active.jpg",
          isActive: true
        }
      ];

      Medicine.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMedicines)
      });

      const res = await request(app)
        .get("/api/medicines")
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.data.medicines).toHaveLength(1);
      expect(res.body.data.medicines[0].isActive).toBe(true);
    });
  });

  describe("GET /api/medicines/:id (Public - Optional Auth)", () => {
    it("should return medicine by ID successfully", async () => {
      const mockMedicine = {
        _id: "med123",
        name: "Specific Medicine",
        description: "Specific description",
        price: 25.99,
        quantity: 75,
        image: "specific.jpg",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Clear previous mocks and set up fresh - make it thenable (can be awaited)
      Medicine.findOne.mockReset();
      Medicine.findOne.mockResolvedValue(mockMedicine);

      const res = await request(app)
        .get("/api/medicines/med123")
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Specific Medicine");
      expect(Medicine.findOne).toHaveBeenCalledWith({
        _id: "med123",
        isActive: true
      });
    });

    it("should return 404 when medicine not found", async () => {
      // Clear and reset mock - make it return null directly
      Medicine.findOne.mockReset();
      Medicine.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/medicines/nonexistent123")
        .expect(STATUS_CODES.NOT_FOUND);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Medicine not found/);
    });

    it("should return 404 when medicine is inactive", async () => {
      // Clear and reset mock - make it return null directly
      Medicine.findOne.mockReset();
      Medicine.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/medicines/inactive123")
        .expect(STATUS_CODES.NOT_FOUND);

      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/medicines (Pharmacy Only)", () => {
    it("should create a new medicine successfully with valid data", async () => {
      const medicineData = {
        name: "New Medicine",
        description: "New medicine description",
        price: 30.99,
        quantity: 200,
        image: "uploads/products/test-image.jpg" // Add image to body for non-multipart requests
      };

      const createdMedicine = {
        _id: "newmed123",
        ...medicineData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Medicine.create.mockResolvedValue(createdMedicine);

      const res = await request(app)
        .post("/api/medicines")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(medicineData)
        .expect(STATUS_CODES.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("New Medicine");
      expect(res.body.data.quantity).toBe(200);
      expect(res.body.data.isActive).toBe(true);
      expect(Medicine.create).toHaveBeenCalledWith({
        ...medicineData,
        isActive: true
      });
    });

    it("should reject medicine creation with decimal quantity", async () => {
      const medicineData = {
        name: "Invalid Medicine",
        description: "Invalid medicine",
        price: 15.99,
        quantity: 5.5, // Invalid decimal
        image: "invalid.jpg"
      };

      const res = await request(app)
        .post("/api/medicines")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(medicineData)
        .expect(STATUS_CODES.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Quantity must be a positive whole number');
    });

    it("should reject medicine creation with zero quantity", async () => {
      const medicineData = {
        name: "Zero Medicine",
        description: "Zero quantity medicine",
        price: 15.99,
        quantity: 0, // Invalid zero
        image: "zero.jpg"
      };

      const res = await request(app)
        .post("/api/medicines")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(medicineData)
        .expect(STATUS_CODES.BAD_REQUEST);

      expect(res.body.success).toBe(false);
    });

    it("should reject medicine creation with negative quantity", async () => {
      const medicineData = {
        name: "Negative Medicine",
        description: "Negative quantity medicine",
        price: 15.99,
        quantity: -10, // Invalid negative
        image: "negative.jpg"
      };

      const res = await request(app)
        .post("/api/medicines")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(medicineData)
        .expect(STATUS_CODES.BAD_REQUEST);

      expect(res.body.success).toBe(false);
    });

    it("should reject medicine creation with missing required fields", async () => {
      const incompleteData = {
        name: "Incomplete Medicine",
        // missing description, price, quantity, image
      };

      const res = await request(app)
        .post("/api/medicines")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(incompleteData)
        .expect(STATUS_CODES.BAD_REQUEST);

      expect(res.body.success).toBe(false);
    });

    it("should reject medicine creation from non-pharmacy users", async () => {
      // Temporarily override the auth middleware to return customer role
      const authMiddleware = require("../middleware/auth.middleware");
      authMiddleware._mock.setUserRole("customer", "customer@test.com");

      const medicineData = {
        name: "Customer Medicine",
        description: "Customer trying to create",
        price: 15.99,
        quantity: 100,
        image: "customer.jpg"
      };

      const res = await request(app)
        .post("/api/medicines")
        .set('Authorization', 'Bearer customer-token')
        .send(medicineData)
        .expect(STATUS_CODES.FORBIDDEN);

      expect(res.body.message).toMatch(/Access denied/);
      
      // Restore original role
      authMiddleware._mock.reset();
    });
  });

  describe("PUT /api/medicines/:id (Pharmacy Only)", () => {
    it("should update medicine successfully with valid data", async () => {
      const updateData = {
        name: "Updated Medicine",
        price: 35.99,
        description: "Updated description"
      };

      const updatedMedicine = {
        _id: "med123",
        name: "Updated Medicine",
        description: "Updated description",
        price: 35.99,
        quantity: 100,
        image: "original.jpg",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Medicine.findByIdAndUpdate.mockResolvedValue(updatedMedicine);

      const res = await request(app)
        .put("/api/medicines/med123")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(updateData)
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Medicine");
      expect(res.body.data.price).toBe(35.99);
      expect(Medicine.findByIdAndUpdate).toHaveBeenCalledWith(
        "med123",
        updateData,
        { new: true, runValidators: true }
      );
    });

    it("should validate quantity during update", async () => {
      const updateData = {
        quantity: 0.5 // Invalid decimal
      };

      const res = await request(app)
        .put("/api/medicines/med123")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(updateData)
        .expect(STATUS_CODES.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Quantity must be a positive whole number');
    });

    it("should handle image upload during update", async () => {
      const updateData = {
        name: "Updated with Image"
      };

      const updatedMedicine = {
        _id: "med123",
        name: "Updated with Image",
        description: "Original description",
        price: 25.99,
        quantity: 100,
        image: "uploads/products/test-image.jpg",
        isActive: true
      };

      Medicine.findByIdAndUpdate.mockResolvedValue(updatedMedicine);

      const res = await request(app)
        .put("/api/medicines/med123")
        .set('Authorization', 'Bearer pharmacy-token')
        .field('name', updateData.name)
        .attach('image', Buffer.from('fake-image'), 'test-image.jpg')
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      expect(res.body.data.image).toBe("uploads/products/test-image.jpg");
    });

    it("should return 404 when updating non-existent medicine", async () => {
      const updateData = {
        name: "Updated Name"
      };

      Medicine.findByIdAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/medicines/nonexistent123")
        .set('Authorization', 'Bearer pharmacy-token')
        .send(updateData)
        .expect(STATUS_CODES.NOT_FOUND);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Medicine not found/);
    });
  });

  describe("GET /api/medicines/pharmacy/all (Pharmacy Only)", () => {
    it("should return all medicines including inactive for pharmacy", async () => {
      const mockMedicines = [
        {
          _id: "med1",
          name: "Active Medicine",
          description: "Active desc",
          price: 10,
          quantity: 100,
          image: "active.jpg",
          isActive: true
        },
        {
          _id: "med2",
          name: "Inactive Medicine", 
          description: "Inactive desc",
          price: 15,
          quantity: 0,
          image: "inactive.jpg",
          isActive: false
        }
      ];

      Medicine.countDocuments.mockResolvedValue(2);
      Medicine.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMedicines),
        clone: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getFilter: jest.fn().mockReturnValue({})
      });

      const res = await request(app)
        .get("/api/medicines/pharmacy/all")
        .set('Authorization', 'Bearer pharmacy-token')
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      if (res.body.data.pagination) {
        expect(res.body.data.medicines).toHaveLength(2);
        expect(res.body.data.pagination.totalItems).toBe(2);
      } else {
        expect(res.body.data.medicines).toHaveLength(2);
      }
    });

    it("should reject access from non-pharmacy users", async () => {
      // Temporarily override the auth middleware to return customer role
      const authMiddleware = require("../middleware/auth.middleware");
      authMiddleware._mock.setUserRole("customer", "customer@test.com");

      const res = await request(app)
        .get("/api/medicines/pharmacy/all")
        .set('Authorization', 'Bearer customer-token')
        .expect(STATUS_CODES.FORBIDDEN);

      expect(res.body.message).toMatch(/Access denied/);
      
      // Restore original role
      authMiddleware._mock.reset();
    });
  });

  describe("PATCH /api/medicines/:id/deactivate (Pharmacy Only)", () => {
    it("should deactivate medicine successfully", async () => {
      const deactivatedMedicine = {
        _id: "med123",
        name: "Test Medicine",
        description: "Test desc",
        price: 10,
        quantity: 100,
        image: "test.jpg",
        isActive: false, // Now deactivated
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Medicine.findByIdAndUpdate.mockResolvedValue(deactivatedMedicine);

      const res = await request(app)
        .patch("/api/medicines/med123/deactivate")
        .set('Authorization', 'Bearer pharmacy-token')
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
      expect(Medicine.findByIdAndUpdate).toHaveBeenCalledWith(
        "med123",
        { isActive: false },
        { new: true }
      );
    });

    it("should return 404 when deactivating non-existent medicine", async () => {
      Medicine.findByIdAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/medicines/nonexistent123/deactivate")
        .set('Authorization', 'Bearer pharmacy-token')
        .expect(STATUS_CODES.NOT_FOUND);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Medicine not found/);
    });
  });

  describe("PATCH /api/medicines/:id/activate (Pharmacy Only)", () => {
    it("should activate medicine successfully", async () => {
      const activatedMedicine = {
        _id: "med123",
        name: "Test Medicine",
        description: "Test desc",
        price: 10,
        quantity: 100,
        image: "test.jpg",
        isActive: true, // Now activated
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Medicine.findByIdAndUpdate.mockResolvedValue(activatedMedicine);

      const res = await request(app)
        .patch("/api/medicines/med123/activate")
        .set('Authorization', 'Bearer pharmacy-token')
        .expect(STATUS_CODES.SUCCESS);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);
      expect(Medicine.findByIdAndUpdate).toHaveBeenCalledWith(
        "med123",
        { isActive: true },
        { new: true }
      );
    });

    it("should return 404 when activating non-existent medicine", async () => {
      Medicine.findByIdAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/medicines/nonexistent123/activate")
        .set('Authorization', 'Bearer pharmacy-token')
        .expect(STATUS_CODES.NOT_FOUND);

      expect(res.body.success).toBe(false);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle database errors gracefully", async () => {
      Medicine.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error("Database connection failed"))
      });

      const res = await request(app)
        .get("/api/medicines")
        .expect(STATUS_CODES.INTERNAL_SERVER_ERROR);

      expect(res.body.success).toBe(false);
    });

    it("should handle invalid medicine ID format", async () => {
      // Clear and reset mock - make it return null directly
      Medicine.findOne.mockReset();
      Medicine.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/medicines/invalid-id-format")
        .expect(STATUS_CODES.NOT_FOUND);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Medicine not found/);
    });

    it("should handle image upload in create medicine", async () => {
      const medicineData = {
        name: "Medicine with Image",
        description: "Medicine with uploaded image",
        price: 20.99,
        quantity: 150
        // image will be added by upload middleware
      };

      const createdMedicine = {
        _id: "imgmed123",
        ...medicineData,
        image: "uploads/products/test-image.jpg", // From upload middleware
        isActive: true
      };

      Medicine.create.mockResolvedValue(createdMedicine);

      const res = await request(app)
        .post("/api/medicines")
        .set('Authorization', 'Bearer pharmacy-token')
        .field('name', medicineData.name)
        .field('description', medicineData.description)
        .field('price', medicineData.price.toString())
        .field('quantity', medicineData.quantity.toString())
        .attach('image', Buffer.from('fake-image'), 'test-image.jpg')
        .expect(STATUS_CODES.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.image).toBe("uploads/products/test-image.jpg");
    });
  });
});