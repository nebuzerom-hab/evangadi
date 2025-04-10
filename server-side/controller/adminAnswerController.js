const dbConnection = require("../db/dbConfig");

// Admin: Get all questions with answers
const db = require("../db/dbConfig");
async function getAllQuestionWithAnswers(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT 
        q.question_id,
        q.title,
        q.description,
        q.created_at AS question_created_at,
        
        qu.user_id AS question_user_id,
        qu.user_name AS question_user_name,
        qu.first_name AS question_first_name,
        qu.last_name AS question_last_name,
        qu.email AS question_email,
        
        a.answer_id,
        a.answer,
        a.created_at AS answer_created_at,
        
        au.user_id AS answer_user_id,
        au.user_name AS answer_user_name,
        au.first_name AS answer_first_name,
        au.last_name AS answer_last_name,
        au.email AS answer_email
        
      FROM questionTable q
      JOIN userTable qu ON q.user_id = qu.user_id
      LEFT JOIN answerTable a ON a.question_id = q.question_id
      LEFT JOIN userTable au ON a.user_id = au.user_id
      ORDER BY q.created_at DESC, a.created_at ASC
    `);

    // Group by question
    const questionsMap = new Map();

    rows.forEach((row) => {
      const questionId = row.question_id;

      if (!questionsMap.has(questionId)) {
        questionsMap.set(questionId, {
          question_id: row.question_id,
          title: row.title,
          description: row.description,
          created_at: row.question_created_at,
          posted_by: {
            user_id: row.question_user_id,
            user_name: row.question_user_name,
            first_name: row.question_first_name,
            last_name: row.question_last_name,
            email: row.question_email,
          },
          answers: [],
        });
      }

      if (row.answer_id) {
        questionsMap.get(questionId).answers.push({
          answer_id: row.answer_id,
          answer: row.answer,
          created_at: row.answer_created_at,
          posted_by: {
            user_id: row.answer_user_id,
            user_name: row.answer_user_name,
            first_name: row.answer_first_name,
            last_name: row.answer_last_name,
            email: row.answer_email,
          },
        });
      }
    });

    res.json(Array.from(questionsMap.values()));
  } catch (error) {
    console.error("Error fetching questions and answers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const deleteAnswer = async (req, res) => {
  let connection;
  try {
    const { answerId } = req.params;
    const userId = req.user?.user_id;
    const isAdmin = req.user?.is_admin === 1;

    // Validate answerId
    if (!answerId || isNaN(Number(answerId))) {
      return res.status(400).json({
        success: false,
        error: "Invalid Input",
        message: "Please provide a valid answer ID",
      });
    }

    connection = await dbConnection.getConnection();
    await connection.beginTransaction();

    // Check if answer exists and get owner info
    const [answer] = await connection.query(
      `SELECT user_id FROM answerTable WHERE answer_id = ?`,
      [answerId]
    );

    if (answer.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Answer not found",
      });
    }

    // Authorization check - only owner or admin can delete
    if (answer[0].user_id !== userId && !isAdmin) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You are not authorized to delete this answer",
      });
    }

    // Delete all ratings associated with this answer first
    const [ratingResult] = await connection.query(
      `DELETE FROM answer_ratings WHERE answer_id = ?`,
      [answerId]
    );

    // Now delete the answer
    const [deleteResult] = await connection.query(
      `DELETE FROM answerTable WHERE answer_id = ?`,
      [answerId]
    );

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Answer could not be deleted",
      });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Answer and associated ratings deleted successfully",
      deletedRatingsCount: ratingResult.affectedRows || 0,
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Error deleting answer:", err);

    // Handle specific database errors
    if (
      err.code === "ER_ROW_IS_REFERENCED_2" ||
      err.code === "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(409).json({
        success: false,
        error: "Database Conflict",
        message:
          "Cannot delete answer due to existing references in other tables",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Server Error",
      message:
        err.message || "An unexpected error occurred while deleting the answer",
    });
  } finally {
    if (connection) connection.release();
  }
};

//admin:update any answer
const updateAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { updatedAnswer } = req.body;
    const userId = req.user?.user_id;
    const isAdmin = req.user?.is_admin === 1; // Check if user is admin

    // Validate answerId and updatedAnswer
    if (!answerId || isNaN(Number(answerId))) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide a valid answer ID",
      });
    }

    if (!updatedAnswer || updatedAnswer.trim() === "") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Updated answer cannot be empty",
      });
    }

    // Check if the answer exists
    const checkAnswerQuery = `
      SELECT user_id FROM answerTable WHERE answer_id = ?;
    `;
    const [answerRows] = await dbConnection.query(checkAnswerQuery, [answerId]);

    if (answerRows.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Answer not found",
      });
    }

    const answerOwnerId = answerRows[0].user_id;

    // Check if the user is either the answer owner or an admin
    if (answerOwnerId !== userId && !isAdmin) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to update this answer",
      });
    }

    // Update the answer in the database
    const updateAnswerQuery = `
      UPDATE answerTable SET answer = ? WHERE answer_id = ?;
    `;
    await dbConnection.query(updateAnswerQuery, [updatedAnswer, answerId]);

    return res.status(200).json({
      message: "Answer updated successfully!",
    });
  } catch (err) {
    console.error("Error editing answer:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred",
    });
  }
};

module.exports = { getAllQuestionWithAnswers, deleteAnswer, updateAnswer };
