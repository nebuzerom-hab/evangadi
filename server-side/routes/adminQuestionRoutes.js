const express = require("express");
const router = express.Router();
const {
  getAllQuestionsForAdmin,
  adminUpdateQuestion,
  adminDeleteQuestion,
} = require("../controller/adminQuestionController");

//get all question router
router.get("/", getAllQuestionsForAdmin);

//update question router
router.put("/:id", adminUpdateQuestion);

//delete question
router.delete("/:id", adminDeleteQuestion);

module.exports = router;
