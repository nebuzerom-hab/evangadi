const express = require("express");
const router = express.Router();
const {
  userValidationRules,
} = require("../middleware/validators/userValidators");
const {
  handleValidationErrors,
} = require("../middleware/validators/validationHandler");
const {
  adminMiddleware,
  authMiddleware,
} = require("../middleware/authMiddleware");
const {
  adminDashboard,
  getAllUsers,
  updateUser,
  getUserById,
  deleteUser,
  statistics,
  recentQuestions,
  adminRegisterUser,
} = require("../controller/adminController");

// Admin dashboard route
router.get("/dashboard", authMiddleware, adminMiddleware, adminDashboard);

router.post(
  "/register-user",
  authMiddleware,
  adminMiddleware,
  userValidationRules(),
  handleValidationErrors,
  adminRegisterUser
);

// get all users
router.get("/users", authMiddleware, adminMiddleware, getAllUsers);

// For fetching single user
router.get("/users/:id", authMiddleware, adminMiddleware, getUserById);
//update user
router.put("/users/:id", authMiddleware, adminMiddleware, updateUser);

// Delete user route
router.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);

//statics for all
router.get("/stats", authMiddleware, adminMiddleware, statistics);

//recently posted question
router.get(
  "/recent-questions",
  authMiddleware,
  adminMiddleware,
  recentQuestions
);

module.exports = router;
