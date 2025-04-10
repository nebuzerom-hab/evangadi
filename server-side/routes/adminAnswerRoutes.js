

const express = require("express");
const router = express.Router();

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");
const {
  getAllQuestionWithAnswers,
  deleteAnswer,
  updateAnswer,
} = require("../controller/adminAnswerController");
// get questions with answers for admin
router.get(
  "/question-full",
  authMiddleware,
  adminMiddleware,
  getAllQuestionWithAnswers
);

// get delete answer for admin
router.delete(
  "/answers/:answerId",
  authMiddleware,
  adminMiddleware,
  deleteAnswer
);

// UPDATE answer for admin
router.put("/answers/:answerId", authMiddleware, adminMiddleware, updateAnswer);

module.exports = router;
