const dbConnection = require("../db/dbConfig");

// Admin: Get all questions with user info
const getAllQuestionsForAdmin = async (req, res) => {
  try {
    const [questions] = await dbConnection.query(`
      SELECT 
        q.question_id, 
        q.title, 
        q.description, 
        q.created_at,
        u.user_id,
        u.user_name,
        u.email
      FROM questionTable q
      JOIN userTable u ON q.user_id = u.user_id
      ORDER BY q.created_at DESC
    `);
    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};


// Admin: Update any question
const adminUpdateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    // Validate input
    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    // Check if question exists
    const [question] = await dbConnection.query(
      "SELECT * FROM questionTable WHERE question_id = ?",
      [id]
    );

    if (question.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Update question (admin can update any question)
    await dbConnection.query(
      "UPDATE questionTable SET title = ?, description = ? WHERE question_id = ?",
      [title, description, id]
    );

    // Get updated question with user info
    const [updatedQuestion] = await dbConnection.query(
      `
      SELECT 
        q.question_id, 
        q.title, 
        q.description, 
        q.created_at,
        u.user_id,
        u.user_name
      FROM questionTable q
      JOIN userTable u ON q.user_id = u.user_id
      WHERE q.question_id = ?
    `,
      [id]
    );

    res.json({
      message: "Question updated successfully",
      question: updatedQuestion[0],
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
};

// Admin: Delete any question
const adminDeleteQuestion = async (req, res) => {
  // Get a connection from the pool
  const connection = await dbConnection.getConnection();

  try {
    const { id } = req.params;

    // Check if question exists
    const [question] = await connection.query(
      "SELECT * FROM questionTable WHERE question_id = ?",
      [id]
    );

    if (question.length === 0) {
      connection.release(); // Release before returning
      return res.status(404).json({ error: "Question not found" });
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      // 1. First delete answer ratings
      await connection.query(
        `DELETE FROM answer_ratings 
         WHERE answer_id IN (
           SELECT answer_id FROM answerTable WHERE question_id = ?
         )`,
        [id]
      );

      // 2. Then delete answers
      await connection.query("DELETE FROM answerTable WHERE question_id = ?", [
        id,
      ]);

      // 3. Finally delete the question
      await connection.query(
        "DELETE FROM questionTable WHERE question_id = ?",
        [id]
      );

      // Commit the transaction
      await connection.commit();

      res.json({
        message: "Question and all associated answers deleted successfully",
      });
    } catch (error) {
      // Rollback if any error occurs
      await connection.rollback();
      throw error; // This will be caught by the outer catch
    }
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      error: "Failed to delete question",
      details: error.message,
    });
  } finally {
    // Always release the connection
    if (connection) connection.release();
  }
};

module.exports = {
  getAllQuestionsForAdmin,
  adminUpdateQuestion,
  adminDeleteQuestion,
};
