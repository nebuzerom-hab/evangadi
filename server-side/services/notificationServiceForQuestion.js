const db = require("../db/dbConfig");
const emailService = require("./emailService");

const NotificationService = {
  async notifyNewQuestion(questionId) {
    try {
      // Get question details
      const [question] = await db.query(
        "SELECT title, description, user_id FROM questionTable WHERE question_id = ?",
        [questionId]
      );

      if (!question[0]) return;

      // Get author details
      const [author] = await db.query(
        "SELECT email,first_name FROM userTable WHERE user_id = ?",
        [question[0].user_id]
      );

      // Get all users who should be notified
      const [users] = await db.query(
        "SELECT email, first_name  FROM userTable WHERE user_id != ? AND is_banned = 0",
        [question[0].user_id]
      );

      if (!users.length) return;

      // Construct the question URL
      const questionUrl = `${process.env.FRONTEND_URL}/questions/${questionId}`;

      // Prepare email content
      const subject = `New Question: ${question[0].description}`;

      // Send notifications with personalized messages
      await sendBulkEmails(
        users,
        subject,
        (user) => `
        <h2>Hello ${user.first_name},</h2>
        <p>${author[0].first_name} asked a new question:</p>
        <h3>${question[0].description}</h3>
        <p>Click here to view and answer: <a href="${questionUrl}">${questionUrl}</a></p>
        <p>Or visit our platform to engage with this question!</p>
        <p>Best regards,<br/>Evangadi Question and Answer Team</p>
      `
      );
    } catch (error) {
      console.error("Notification error:", error);
    }
  },
};

async function sendBulkEmails(recipients, subject, messageTemplate) {
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.all(
      batch.map((user) => {
        const personalizedMessage = messageTemplate(user);
        return emailService.sendNotification(
          user.email,
          subject,
          personalizedMessage
        );
      })
    );
  }
}

module.exports = NotificationService;
