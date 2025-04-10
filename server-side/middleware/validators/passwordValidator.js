const { check } = require("express-validator");

const passwordValidationRules = () => {
  return [
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

const changePasswordValidationRules = () => {
  return [
    check("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    check("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/[a-z]/)
      .withMessage("Password must contain at least one lowercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain at least one number")
      .matches(/[^a-zA-Z0-9]/)
      .withMessage("Password must contain at least one special character")
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error(
            "New password must be different from current password"
          );
        }
        return true;
      }),
  ];
};

module.exports = {
  passwordValidationRules,
  changePasswordValidationRules,
};
