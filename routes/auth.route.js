const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const authController = require("../controllers/auth.controller");

router.post("/signup", authController.signUp);
router.post("/login", authController.login);

router.post(
  "/add-admin",
  authenticate,
  authorize("admin"),
  authController.addAdmin
);

module.exports = router;
