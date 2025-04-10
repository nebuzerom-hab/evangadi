const { sendNotification } = require("./emailService");
const dbConnection = require("../db/dbConfig");

const notifyUsersAboutNewAnswer = async (
  questionId,
  answerText,
  answeringUserId
) => {
  try {
    // Get the question details
    const [question] = await dbConnection.query(
      `SELECT q.title, q.description, u.user_name AS asker_name 
       FROM questionTable q
       JOIN userTable u ON q.user_id = u.user_id
       WHERE q.question_id = ?`,
      [questionId]
    );

    if (!question || question.length === 0) {
      console.error("Question not found");
      return false;
    }

    // Get the answering first's name
    const [answeringUser] = await dbConnection.query(
      `SELECT first_name FROM userTable WHERE user_id = ?`,
      [answeringUserId]
    );

    if (!answeringUser || answeringUser.length === 0) {
      console.error("Answering user not found");
      return false;
    }

    // Get all users who should be notified (all registered users except the answering user)
    const [users] = await dbConnection.query(
      `SELECT email, first_name FROM userTable WHERE user_id != ? AND is_banned = 0`,
      [answeringUserId]
    );

    if (!users || users.length === 0) {
      console.log("No users to notify");
      return true;
    }

    const questionTitle = question[0].description;
    const answeringFirstName = answeringUser[0].first_name;

    console.log(answeringFirstName);
    // Prepare email content
    const subject = `New Answer Posted for: ${questionTitle}`;

    // Construct the answer link
    const answerLink = `${process.env.FRONTEND_URL}/questions/${questionId}`;

    const emailPromises = users.map((user) => {
      console.log(user.first_name);
      const message = `
        <h2>Hello ${user.first_name},</h2>
        <p>A new answer has been posted to the question: <strong>${questionTitle}</strong></p>
        <p><strong>${answeringFirstName}</strong> answered:</p>
        <blockquote>${answerText}</blockquote>
        <p>View the full discussion: <a href="${answerLink}">${answerLink}</a></p>
        <p>Best regards,<br/>Evangadi Question and Answer Team</p>
      `;

      return sendNotification(user.email, subject, message);
    });

    // Send all emails in parallel
    await Promise.all(emailPromises);

    console.log(`Notifications sent to ${users.length} users`);
    return true;
  } catch (error) {
    console.error("Error in notification service:", error);
    return false;
  }
};

module.exports = { notifyUsersAboutNewAnswer };
