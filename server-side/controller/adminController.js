const { StatusCodes } = require("http-status-codes");
const dbConnection = require("../db/dbConfig");
const bcrypt = require("bcryptjs");

// Admin dashboard
const adminDashboard = (req, res) => {
  res.status(StatusCodes.OK).json({
    msg: `Welcome Admin ${req.user.username}`,
    user: req.user,
  });
};

// Admin register user
async function adminRegisterUser(req, res) {
  // Only allow admins to access this endpoint
  if (!req.user || !req.user.is_admin) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ msg: "Unauthorized" });
  }

  const { username, firstname, lastname, email, password } = req.body;

  // Validate required fields
  if (!username || !firstname || !lastname || !email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "All input is required" });
  }

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

    // Password validation
    if (password.length < 8) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Password must be at least 8 characters long" });
    }

    // Encrypt the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Always register as regular user (0) when admin creates user
    await dbConnection.query(
      "INSERT INTO usertable (user_name, first_name, last_name, email, password, is_admin) VALUES (?, ?, ?, ?, ?, ?)",
      [username, firstname, lastname, email, hashedPassword, 0]
    );

    return res.status(StatusCodes.CREATED).json({
      msg: "User registered successfully",
      user: { username, email, isAdmin: false },
    });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal server error" });
  }
}

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const [users] = await dbConnection.query(
      "SELECT user_id, user_name, first_name, last_name, email, is_admin,created_at FROM usertable ORDER BY created_at DESC"
    );
    res.status(StatusCodes.OK).json({ users });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error fetching users",
    });
  }
};
//  fetch all user with contain edit button
async function updateUser(req, res) {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Prevent updating sensitive fields directly
    const { password, is_admin, ...safeUpdateData } = updateData;

    await dbConnection.query("UPDATE usertable SET ? WHERE user_id = ?", [
      safeUpdateData,
      id,
    ]);

    // Fetch updated user data to return
    const [updatedUser] = await dbConnection.query(
      "SELECT user_id, user_name, first_name, last_name, email, is_admin FROM usertable WHERE user_id = ?",
      [id]
    );

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "User not found",
      });
    }

    return res.status(StatusCodes.OK).json({
      msg: "User updated successfully",
      user: updatedUser[0], // Make sure to return the first user in the array
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error updating user",
      error: error.message,
    });
  }
}
//this is used to select specific user to update
async function getUserById(req, res) {
  const { id } = req.params;
  console.log(id);
  try {
    const [user] = await dbConnection.query(
      "SELECT user_id, user_name, first_name, last_name, email, is_admin FROM usertable WHERE user_id = ?",
      [id]
    );
    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
    }
    return res.status(StatusCodes.OK).json({ user: user[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error fetching user",
      error: error.message,
    });
  }
}


async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    // First verify user exists
    const [user] = await dbConnection.query(
      "SELECT user_id FROM userTable WHERE user_id = ?",
      [id]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "User not found",
      });
    }

    // Start a transaction to ensure data integrity
    await dbConnection.query("START TRANSACTION");

    try {
      // First delete answer ratings for answers made by this user
      await dbConnection.query("DELETE FROM answer_ratings WHERE user_id = ?", [
        id,
      ]);

      // Then delete ratings for answers to questions this user created
      // (answers by other users to this user's questions)
      await dbConnection.query(
        `DELETE ar FROM answer_ratings ar 
         JOIN answerTable a ON ar.answer_id = a.answer_id 
         JOIN questionTable q ON a.question_id = q.question_id 
         WHERE q.user_id = ?`,
        [id]
      );

      // Then delete answers made by this user
      await dbConnection.query("DELETE FROM answerTable WHERE user_id = ?", [
        id,
      ]);

      // Then delete answers to this user's questions (by other users)
      await dbConnection.query(
        "DELETE a FROM answerTable a JOIN questionTable q ON a.question_id = q.question_id WHERE q.user_id = ?",
        [id]
      );

      // Now we can safely delete the user's questions
      await dbConnection.query("DELETE FROM questionTable WHERE user_id = ?", [
        id,
      ]);

      // Finally delete the user
      await dbConnection.query("DELETE FROM userTable WHERE user_id = ?", [id]);

      // Commit the transaction if all queries succeed
      await dbConnection.query("COMMIT");

      return res.status(StatusCodes.OK).json({
        msg: "User and all associated data deleted successfully",
        deletedUserId: id,
      });
    } catch (error) {
      // Rollback if any error occurs
      await dbConnection.query("ROLLBACK");
      console.error("Transaction error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error deleting user and associated data",
      error: error.message,
    });
  }
}

async function statistics(req, res) {
  try {
    const [results] = await dbConnection.query(`
      SELECT 
        (SELECT COUNT(*) FROM userTable) as totalUsers,
        (SELECT COUNT(*) FROM questionTable) as totalQuestions,
        (SELECT COUNT(*) FROM answerTable) as totalAnswers,
        (SELECT COUNT(*) FROM answer_ratings) as totalRatings
    
    `);

    // Convert all counts to numbers
    res.json({
      totalUsers: Number(results[0].totalUsers),
      totalQuestions: Number(results[0].totalQuestions),
      totalAnswers: Number(results[0].totalAnswers),
      totalRatings: Number(results[0].totalRatings),
      // activeReports: Number(results[0].activeReports),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({
      error: "Failed to fetch admin statistics",
      // Provide zeros as fallback
      totalUsers: 0,
      totalQuestions: 0,
      totalAnswers: 0,
      totalRatings: 0,
      // activeReports: 0,
    });
  }
}

async function recentQuestions(req, res) {
  try {
    const [questions] = await dbConnection.query(`
      SELECT 
        q.question_id as id, 
        q.title, 
        q.description,
        q.created_at, 
        u.user_name,
        u.user_id
      FROM questionTable q
      JOIN userTable u ON q.user_id = u.user_id
      ORDER BY q.created_at DESC
      LIMIT 5
    `);
    res.json(questions);
  } catch (error) {
    console.error("Error fetching recent questions:", error);
    res.status(500).json({ error: "Failed to fetch recent questions" });
  }
}

async function reportedContent(req, res) {
  try {
    const [reports] = await dbConnection.query(`
      SELECT 
        r.report_id as id,
        r.content_type,
        r.reason,
        r.created_at,
        u.user_name as reporter_name,
        r.status
      FROM reports r
      JOIN userTable u ON r.reporter_id = u.user_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reported content:", error);
    res.status(500).json({ error: "Failed to fetch reported content" });
  }
}


module.exports = {
  adminDashboard,
  getAllUsers,
  updateUser,
  getUserById,
  deleteUser,
  statistics,
  recentQuestions,
  adminRegisterUser,
};
