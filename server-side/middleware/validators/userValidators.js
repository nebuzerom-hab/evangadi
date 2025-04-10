const { check } = require("express-validator");

const userValidationRules = () => {
  return [
    // Username validation
    check("username")
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3-20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      ),

    // First name validation
    check("firstname")
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2-50 characters")
      .matches(/^[a-zA-Z]+$/)
      .withMessage("First name can only contain letters"),

    // Last name validation
    check("lastname")
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2-50 characters")
      .matches(/^[a-zA-Z]+$/)
      .withMessage("Last name can only contain letters"),

    // Email validation
    check("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),

    // Password validation
    check("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/[a-z]/)
      .withMessage("Password must contain at least one lowercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain at least one number")
      .matches(/[^a-zA-Z0-9]/)
      .withMessage("Password must contain at least one special character"),
  ];
};

module.exports = { userValidationRules };
