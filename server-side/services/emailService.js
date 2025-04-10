const nodemailer = require("nodemailer");

// For Gmail (enable "Less secure apps" or use App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendNotification = async (recipient, subject, message) => {
  try {
    await transporter.sendMail({
      from: `"Evangadi-Q&A Platform from Yibeltal" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: subject,
      html: message,
    });
    console.log(`Email sent to ${recipient}`);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
};

module.exports = { sendNotification };
