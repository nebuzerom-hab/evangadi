// for user and admin authentication

const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");

// Regular authentication middleware
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Authorization invalid" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { username, user_id, is_admin } = jwt.verify(
      // Changed from 'role' to 'is_admin'
      token,
      process.env.JWT_SECRET
    );
    req.user = { username, user_id, is_admin };
    next();
  } catch (error) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Authentication invalid" });
  }
}

// Admin-specific middleware to check if the user is an admin
function adminMiddleware(req, res, next) {
  // req.user should already be set by authMiddleware
  if (!req.user?.is_admin) {
    // Changed from checking 'role' to 'is_admin'
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ msg: "Access denied. Admin privileges required." });
  }
  next();
}

module.exports = {
  authMiddleware,
  adminMiddleware,
};
