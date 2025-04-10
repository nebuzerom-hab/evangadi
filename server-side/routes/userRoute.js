// original
const express = require("express");
const router = express.Router();
const {
  userValidationRules,
} = require("../middleware/validators/userValidators");

const {
  handleValidationErrors,
} = require("../middleware/validators/validationHandler");

const {
  changePasswordValidationRules,
} = require("../middleware/validators/passwordValidator");

const { authMiddleware } = require("../middleware/authMiddleware");
// user controller
const {
  register,
  login,
  checkEmail,
  checkUser,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require("../controller/userController");

router.post(
  "/register",
  userValidationRules(),
  handleValidationErrors,
  register
);

//login route
router.post("/login", login);
router.post("/check-email", checkEmail);

// check  regular user and admin user route
router.get("/checkUser", authMiddleware, checkUser);

//select user profile route
router.get("/profile", authMiddleware, getProfile);

//update user profile route
router.put("/profile", authMiddleware, updateProfile);

//change password route first
router.put("/change-password", authMiddleware, changePassword);

// router.put(
//   "/change-password",
//   authMiddleware,
//   changePasswordValidationRules(),
//   handleValidationErrors,
//   changePassword
// );

// forgot password route
router.post("/forgot-password", forgotPassword);

// verify reset token route
router.get("/verify-reset-token/:token", verifyResetToken);

// reset password route
router.post("/reset-password", resetPassword);

module.exports = router;
