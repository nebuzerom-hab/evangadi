const bcrypt = require("bcryptjs");
const dbConnection = require("../db/dbConfig");

async function verifyCurrentPassword(userId, currentPassword) {
  const [user] = await dbConnection.query(
    "SELECT password FROM usertable WHERE user_id = ?",
    [userId]
  );

  if (user.length === 0) return false;

  return await bcrypt.compare(currentPassword, user[0].password);
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function updateUserPassword(userId, newPassword) {
  const hashedPassword = await hashPassword(newPassword);
  await dbConnection.query(
    "UPDATE usertable SET password = ? WHERE user_id = ?",
    [hashedPassword, userId]
  );
}

module.exports = {
  verifyCurrentPassword,
  updateUserPassword,
  hashPassword,
};
