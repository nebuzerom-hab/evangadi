// db connection
const dbConnection = require("../db/dbConfig");

const { StatusCodes } = require("http-status-codes");

//post answers for questions first


//post answers for questions with email notification
const {
  notifyUsersAboutNewAnswer,
} = require("../services/notificationServiceForAnswer");

const postAnswersForQuestions = async (req, res) => {
  try {
    const questionId = req.params.question_id;
    const { answer } = req.body;
    const userId = req.user?.user_id;

    // Validate answer
    if (!answer || answer.trim() === "") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Answer cannot be empty",
      });
    }

    // Validate questionId
    if (!questionId || isNaN(Number(questionId))) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide a valid question ID",
      });
    }

    // Insert the answer into the database
    const insertAnswerQuery = `
      INSERT INTO answerTable (user_id, question_id, answer)
      VALUES (?, ?, ?);
    `;

    const [insertResult] = await dbConnection.query(insertAnswerQuery, [
      userId,
      questionId,
      answer,
    ]);

    if (!insertResult.affectedRows) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to insert answer into the database",
      });
    }

    // Send notifications to all users (async - don't wait for completion)
    notifyUsersAboutNewAnswer(questionId, answer, userId)
      .then((success) => {
        if (!success) {
          console.error("Failed to send some notifications");
        }
      })
      .catch((err) => {
        console.error("Notification error:", err);
      });

    return res.status(201).json({
      message: "Answer submitted successfully!",
    });
  } catch (err) {
    console.error("Error submitting answer:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred",
    });
  }
};

async function getAnswersForQuestions(req, res) {
  try {
    const { question_id } = req.params; // Get the question_id from request parameters
    const response = await dbConnection.query(
      `SELECT usertable.user_name, answertable.answer 
   FROM usertable 
   JOIN answertable ON answertable.user_id = usertable.user_id 
   WHERE answertable.question_id = ? `,
      [question_id]
    );

    // console.log(question_id);

    res.status(200).json(response[0]);
    console.log(response);
  } catch (error) {
    console.error("Error fetching answers:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
const deleteAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const userId = req.user?.user_id; // Assume user ID is stored in req.user.user_id
    console.log(answerId);

    // Validate answerId
    if (!answerId || isNaN(Number(answerId))) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide a valid answer ID",
      });
    }

    // Check if the answer exists and belongs to the requesting user
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

    if (answerRows[0].user_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to delete this answer",
      });
    }

    // Delete the answer from the database
    const deleteAnswerQuery = `
      DELETE FROM answerTable WHERE answer_id = ?;
    `;
    await dbConnection.query(deleteAnswerQuery, [answerId]);

    return res.status(200).json({
      message: "Answer deleted successfully!",
    });
  } catch (err) {
    console.error("Error deleting answer:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred",
    });
  }
};
// answerController.js
const getAnswerById = async (req, res) => {
  try {
    const { answerId } = req.params;
    const userId = req.user?.user_id;

    if (!answerId || isNaN(Number(answerId))) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide a valid answer ID",
      });
    }

    const getAnswerQuery = `
      SELECT answer_id, answer, user_id 
      FROM answerTable 
      WHERE answer_id = ?;
    `;
    const [answerRows] = await dbConnection.query(getAnswerQuery, [answerId]);

    if (answerRows.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Answer not found",
      });
    }

    // Verify ownership
    if (answerRows[0].user_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to view this answer",
      });
    }

    return res.status(200).json({
      answer: answerRows[0].answer,
    });
  } catch (err) {
    console.error("Error fetching answer:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred",
    });
  }
};
const updateAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    // const { questionId } = req.params;
    const { updatedAnswer } = req.body;
    const userId = req.user?.user_id;
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

    // Check if the answer exists and belongs to the requesting user
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

    if (answerRows[0].user_id !== userId) {
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
const rateAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { rating } = req.body;
    const userId = req.user?.user_id;

    // Validate rating
    if (!rating || isNaN(rating)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Rating must be a number",
      });
    }

    const numericRating = Number(rating);
    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if answer exists
    const [answer] = await dbConnection.query(
      "SELECT user_id FROM answerTable WHERE answer_id = ?",
      [answerId]
    );

    if (answer.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Answer not found",
      });
    }

    // Prevent users from rating their own answers
    if (answer[0].user_id === userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You cannot rate your own answer",
      });
    }

    // Check if user already rated this answer
    const [existingRating] = await dbConnection.query(
      "SELECT rating_id FROM answer_ratings WHERE answer_id = ? AND user_id = ?",
      [answerId, userId]
    );

    if (existingRating.length > 0) {
      // Update existing rating
      await dbConnection.query(
        "UPDATE answer_ratings SET rating = ? WHERE rating_id = ?",
        [numericRating, existingRating[0].rating_id]
      );
    } else {
      // Insert new rating
      await dbConnection.query(
        "INSERT INTO answer_ratings (answer_id, user_id, rating) VALUES (?, ?, ?)",
        [answerId, userId, numericRating]
      );
    }

    // Calculate new average rating (handle NULL case)
    const [avgResult] = await dbConnection.query(
      "SELECT COALESCE(AVG(rating), 0) as average FROM answer_ratings WHERE answer_id = ?",
      [answerId]
    );

    const averageRating = Number(avgResult[0].average); // Ensure it's a number

    // Update answer with new average rating
    await dbConnection.query(
      "UPDATE answerTable SET average_rating = ? WHERE answer_id = ?",
      [averageRating.toFixed(2), answerId]
    );

    return res.status(200).json({
      message: "Rating submitted successfully",
      average_rating: averageRating.toFixed(2),
    });
  } catch (err) {
    console.error("Error rating answer:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred",
    });
  }
};

module.exports = {
  getAnswersForQuestions,
  postAnswersForQuestions,
  deleteAnswer,
  getAnswerById,
  updateAnswer,
  rateAnswer,
};
