const mysql2 = require("mysql2");
const express = require("express");
const app = express();
require("dotenv").config({ path: __dirname + "/../.env" });

console.log(process.env.DB_HOST,);

const dbConnection = mysql2.createPool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
dbConnection.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Successfully connected to the database!");
  connection.release();
});

//for table creation

//GET is used to request data from a specified resource.

 app.get("/install", (req, res) => {
  let createUserTable = `CREATE TABLE IF NOT EXISTS userTable (
    user_id INT(20) AUTO_INCREMENT NOT NULL,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
  is_banned tinyint(1) DEFAULT '0',
  reset_token varchar(255) DEFAULT NULL,
  reset_token_expiry datetime DEFAULT NULL,
  is_admin tinyint(1) DEFAULT '0'
)`;

  let createquestionTable = `CREATE TABLE IF NOT EXISTS questionTable (
    user_id INT(20),
    question_id INT(20) AUTO_INCREMENT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (question_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES userTable(user_id)
)`;

  let createanswerTable = `CREATE TABLE IF NOT EXISTS answerTable (
   answer_id INT(20) AUTO_INCREMENT NOT NULL,
    user_id INT(20),
    question_id INT(20),
    answer VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (answer_id),
    FOREIGN KEY (question_id) REFERENCES questionTable(question_id),
    FOREIGN KEY (user_id) REFERENCES userTable(user_id),
     average_rating decimal(3,2) DEFAULT '0.00'
)`;

  let answerRating = `CREATE TABLE IF NOT EXISTS answer_ratings (
rating_id int(11) NOT NULL AUTO_INCREMENT,
  answer_id int(20) DEFAULT NULL,
  user_id int(20) DEFAULT NULL,
  rating tinyint(4) DEFAULT NULL,
  PRIMARY KEY (rating_id),
  FOREIGN KEY (answer_id) REFERENCES answerTable(answer_id),
  FOREIGN KEY (user_id) REFERENCES userTable(user_id),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

  dbConnection.query(createUserTable, (err) => {
    if (err) return res.status(500).send("Error creating UserTable: " + err);

    dbConnection.query(createquestionTable, (err) => {
      if (err)
        return res.status(500).send("Error creating questionTabel: " + err);

      dbConnection.query(createanswerTable, (err) => {
        if (err)
          return res.status(500).send("Error creating answerTable: " + err);

        dbConnection.query(answerRating, (err) => {
          if (err)
            return res.status(500).send("Error creating answer_rating: " + err);

          res.send("All tables created successfully!");
        });
      });
    });
  });
});



//for table creation port number only
app.listen(2025, () => console.log("listening to: port localhost:2025,"));
 
module.exports = dbConnection.promise();





