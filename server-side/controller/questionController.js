//edited
const db = require("../db/dbConfig");

// Post a new question with eamil notification
const NotificationService = require("../services/notificationServiceForQuestion");
const postQuestion = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userid = req.user?.user_id;

    if (!userid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found",
      });
    }
    if (!title || !description) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide all required fields",
      });
    }

    const query = `
      INSERT INTO questionTable (user_id, title, description) 
      VALUES (?, ?, ?)
    `;

    // Get the inserted question ID
    const [result] = await db.query(query, [userid, title, description]);
    const questionId = result.insertId;

    // Send notifications (fire-and-forget)
    NotificationService.notifyNewQuestion(questionId).catch((err) =>
      console.error("Notification failed:", err)
    );

    res.status(201).json({
      message: "Question created successfully",
      questionId: questionId,
    });
  } catch (err) {
    console.error("Error posting question:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
};

// Get all questions
const getQuestions = async (req, res) => {
  try {
    const query = `
      SELECT q.question_id, q.title, q.description, u.user_name, q.created_at
      FROM questionTable q
      JOIN userTable u ON q.user_id = u.user_id
      ORDER BY q.created_at DESC;
    `;

    const [results] = await db.query(query);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: "Not Found", message: "No questions found" });
    }
    res.status(200).json({ questions: results });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
};

// Get a single question
const getSingleQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    // Validate questionId
    if (!questionId || isNaN(Number(questionId))) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide a valid question ID",
      });
    }

    // Fetch the question details
    const questionQuery = `
      SELECT q.question_id, q.title, q.description, u.user_name 
      FROM questionTable q
      JOIN userTable u ON q.user_id = u.user_id
      WHERE q.question_id = ?;
    `;

    const [questionResults] = await db.query(questionQuery, [questionId]);

    if (questionResults.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Question not found",
      });
    }

    // Fetch the answers related to the question, ordered by latest
    const answerQuery = `
      SELECT a.answer_id, a.answer, u.user_name, a.created_at
      FROM answerTable a
      JOIN userTable u ON a.user_id = u.user_id
      WHERE a.question_id = ?
      ORDER BY a.created_at DESC;  -- Latest first
    `;

    const [answerResults] = await db.query(answerQuery, [questionId]);

    // Return both question and answers
    return res.status(200).json({
      question: questionResults[0],
      answers: answerResults || [], // Ensure answers is always an array
    });
  } catch (err) {
    console.error("Error fetching question:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
};

//Delete a question
const deleteQuestion = async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.user_id; // get Authenticated user

  try {
    // First, delete all answers related to the question
    await db.execute("DELETE FROM answerTable WHERE question_id = ?", [
      questionId,
    ]);

    // Now, delete the question
    const [result] = await db.execute(
      "DELETE FROM questionTable WHERE question_id = ? AND user_id = ?",
      [questionId, userId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(403)
        .json({ message: "Not authorized or question not found" });
    }

    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

//editing the question
const editQuestion = async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.user_id; // Extracted from authMiddleware
  const { title, description } = req.body;

  console.log("User ID:", userId, "Question ID:", questionId);

  try {
    // Validate input
    if (!questionId || isNaN(Number(questionId))) {
      return res.status(400).json({ message: "Invalid question ID." });
    }
    if (!userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: User ID is missing." });
    }
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required." });
    }

    // Check if the question exists and belongs to the user
    const [rows] = await db.query(
      "SELECT user_id FROM questionTable WHERE question_id = ?",
      [questionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Question not found." });
    }

    if (rows[0].user_id !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the owner of this question." });
    }

    // Update the question in the database
    const [result] = await db.query(
      "UPDATE questionTable SET title = ?, description = ? WHERE question_id = ?",
      [title, description, questionId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(500)
        .json({ message: "Failed to update the question." });
    }

    res.json({ message: "Question updated successfully." });
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  postQuestion,
  getSingleQuestion,
  getQuestions,
  deleteQuestion,
  editQuestion,
};
