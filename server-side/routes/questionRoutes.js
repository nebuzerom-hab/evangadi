const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getQuestions,
  getSingleQuestion,
  postQuestion,
  deleteQuestion,
  editQuestion,
} = require("../controller/questionController");

const router = express.Router();

//Post Question  question
router.post("/questions", postQuestion);

//get all questions from the database
router.get("/all-questions", getQuestions);

// get single question
router.get("/:questionId", getSingleQuestion);

//delete their own questions route
router.delete("/:questionId", deleteQuestion);

// PUT route for editing a question
// router.put("/edit-question:questionId", authMiddleware, editQuestion);
router.put("/:questionId", authMiddleware, editQuestion);

// Route for creating a new question
// router.post("/", authMiddleware, createQuestion);

module.exports = router;
