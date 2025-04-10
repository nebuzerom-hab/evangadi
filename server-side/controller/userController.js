// dbConnection
const dbConnection = require("../db/dbConfig");
const bcrypt = require("bcryptjs");
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const passwordService = require("../services/passwordService");
const { validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
require("dotenv").config(); // For environment variables
// Email service configuration

//user can register as admin by using admin secret key
//user can register as public

async function register(req, res) {
  const { username, firstname, lastname, email, password, adminSecret } =
    req.body;

  try {
    // Check if user already exists
    const [User] = await dbConnection.query(
      "SELECT user_name, user_id FROM usertable WHERE user_name = ? OR email = ?",
      [username, email]
    );

    if (User.length > 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "User already exists" });
    }

    // Encrypt the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default to regular user (0)
    let isAdmin = 0;

    // Check if this is an admin registration attempt
    if (adminSecret) {
      // Only allow admin registration via the secret
      if (adminSecret === process.env.ADMIN_REGISTRATION_SECRET) {
        isAdmin = 1;
      } else {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ msg: "Invalid admin secret" });
      }
    } else if (req.user && req.user.is_admin) {
      // If the request comes from an authenticated admin with no adminSecret,
      // register as regular user (isAdmin remains 0)
      isAdmin = 0;
    } else {
      // Public registration - always regular user
      isAdmin = 0;
    }

    // Insert user into database
    await dbConnection.query(
      "INSERT INTO usertable (user_name, first_name, last_name, email, password, is_admin) VALUES (?, ?, ?, ?, ?, ?)",
      [username, firstname, lastname, email, hashedPassword, isAdmin]
    );

    return res.status(StatusCodes.CREATED).json({
      msg: "User registered successfully",
      isAdmin: isAdmin === 1,
    });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal server error, try again later" });
  }
}

// ##################################################################################################

// for user and admin login page
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "All input is required" });
  }

  try {
    // Get user including is_admin status
    const [user] = await dbConnection.query(
      "SELECT user_name, user_id, password, is_admin FROM usertable WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "Invalid credentials" }); // Generic message for security
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "Invalid credentials" }); // Same generic message
    }

    // Create JWT token with user info
    const username = user[0].user_name;
    const user_id = user[0].user_id;
    const is_admin = user[0].is_admin;

    const token = jwt.sign(
      { username, user_id, is_admin }, // Include is_admin in the token
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // Recommended shorter expiration for security
    );

    // Return response with appropriate data
    return res.status(StatusCodes.OK).json({
      msg: "Login successful",
      token,
      username,
      user_id,
      is_admin: is_admin === 1, // Convert to boolean for clarity
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal server error, try again later" });
  }
}

async function checkEmail(req, res) {
  const { email } = req.body;

  if (!email) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Email is required" });
  }

  try {
    const [user] = await dbConnection.query(
      "SELECT 1 FROM usertable WHERE email = ?",
      [email]
    );

    return res.status(StatusCodes.OK).json({ exists: user.length > 0 });
  } catch (error) {
    console.error("Email check error:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Error checking email" });
  }
}

//#####################################################################################################

// for user and admin checking
async function checkUser(req, res) {
  try {
    const { username, user_id, is_admin } = req.user;

    // Additional security check - verify user still exists in database
    const [user] = await dbConnection.query(
      "SELECT user_name, is_admin FROM usertable WHERE user_id = ?",
      [user_id]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        msg: "User not found",
      });
    }

    // Return appropriate response based on admin status
    if (is_admin === 1) {
      return res.status(StatusCodes.OK).json({
        msg: "Valid admin user",
        user: {
          username,
          user_id,
          is_admin: true,
          privileges: "full", // Can add more detailed privilege info
        },
      });
    } else {
      return res.status(StatusCodes.OK).json({
        msg: "Valid regular user",
        user: {
          username,
          user_id,
          is_admin: false,
        },
      });
    }
  } catch (error) {
    console.error("Check user error:", error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error verifying user status",
    });
  }
}

//profile management
// Get user profile
async function getProfile(req, res) {
  const userId = req.user.user_id;

  try {
    const [user] = await dbConnection.query(
      "SELECT user_id, user_name, first_name, last_name, email FROM usertable WHERE user_id = ?",
      [userId]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
    }

    return res.status(StatusCodes.OK).json(user[0]);
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal server error" });
  }
}

// Update user profile
async function updateProfile(req, res) {
  const userId = req.user.user_id;
  const { username, firstname, lastname, email } = req.body;

  if (!username || !firstname || !lastname || !email) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "All fields are required" });
  }

  try {
    // Check if username or email already exists for another user
    const [existingUser] = await dbConnection.query(
      "SELECT user_id FROM usertable WHERE (user_name = ? OR email = ?) AND user_id != ?",
      [username, email, userId]
    );

    if (existingUser.length > 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Username or email already in use" });
    }

    await dbConnection.query(
      "UPDATE usertable SET user_name = ?, first_name = ?, last_name = ?, email = ? WHERE user_id = ?",
      [username, firstname, lastname, email, userId]
    );

    return res
      .status(StatusCodes.OK)
      .json({ msg: "Profile updated successfully" });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal server error" });
  }
}

// Change password first
async function changePassword(req, res) {
  const userId = req.user.user_id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Both current and new password are required" });
  }

  if (newPassword.length <= 8) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Password must be at least 8 characters long" });
  }

  try {
    // Get current password from DB
    const [user] = await dbConnection.query(
      "SELECT password FROM usertable WHERE user_id = ?",
      [userId]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user[0].password);
    if (!isMatch) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in DB
    await dbConnection.query(
      "UPDATE usertable SET password = ? WHERE user_id = ?",
      [hashedPassword, userId]
    );

    return res
      .status(StatusCodes.OK)
      .json({ msg: "Password changed successfully" });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal server error" });
  }
}

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // console.log(email);//fine
  try {
    // 1. Validate email
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // 2. Find user (don't reveal if user doesn't exist)
    const [users] = await dbConnection.query(
      "SELECT * FROM usertable WHERE email = ?",
      [email]
    );
    // console.log(users);//fine
    if (users.length > 0) {
      const user = users[0];

      // 3. Generate reset token - THIS WAS FAILING
      const resetToken = crypto.randomBytes(20).toString("hex"); // Now works
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      console.log(resetToken); // Log the generated token for debugging fine
      console.log(resetTokenExpiry); // Log the expiry time for debugging fine

      // 4. Update user in database
      await dbConnection.query(
        "UPDATE usertable SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?",
        [resetToken, new Date(resetTokenExpiry), user.user_id]
      );

      // 5. Send email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // This now uses the app password
        },
      });
      console.log(transporter); //fine

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      await transporter.sendMail({
        to: email,
        subject: "Password Reset",
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password</p>`,
      });
    }

    return res.status(200).json({
      msg: "If this email exists in our system, you'll receive a reset link",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

async function verifyResetToken(req, res) {
  const { token } = req.params;

  try {
    // Check if token exists and is not expired
    const [users] = await dbConnection.query(
      "SELECT user_id FROM usertable WHERE reset_token = ? AND reset_token_expiry > NOW()",
      [token]
    );

    if (users.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid or expired reset link",
      });
    }

    // If valid, create a short-lived JWT
    const user = users[0];
    const resetToken = jwt.sign(
      { userId: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Token is valid",
      resetToken,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error verifying token",
    });
  }
}

async function resetPassword(req, res) {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Reset token and new password are required",
    });
  }

  try {
    // Verify the JWT
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    await dbConnection.query(
      `UPDATE usertable 
       SET password = ?, reset_token = NULL, reset_token_expiry = NULL 
       WHERE user_id = ?`,
      [hashedPassword, userId]
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Reset token has expired. Please request a new reset link.",
      });
    }

    console.error("Password reset error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error resetting password",
    });
  }
}

module.exports = {
  register,
  login,
  checkEmail,
  checkUser,
  getProfile,
  updateProfile,
  changePassword,
  // validateChangePassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
};
