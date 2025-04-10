require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");

// Enable CORS for all origins
const corsOptions = {
  origin: "*", // Allow any origin
  credentials: false, // Credentials aren't needed with wildcard origin
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));

const port = 7700;

//db connection
const dbConnection = require("./db/dbConfig");

const { authMiddleware } = require("./middleware/authMiddleware");
const { adminMiddleware } = require("./middleware/authMiddleware");

//  routes middleware file
const userRoutes = require("./routes/userRoute");
const adminRoutes = require("./routes/adminRoutes");
const questionRoute = require("./routes/questionRoutes");
const answerRoutes = require("./routes/answerRoute");
const adminQuestionRoutes = require("./routes/adminQuestionRoutes");
const adminAnswersRoutes = require("./routes/adminAnswerRoutes");
//authentication routes middleware file

// json middleware to extract json data
app.use(express.json());

// user routes middleware
app.use("/api/users", userRoutes);

// post Question middleware
app.use("/api", authMiddleware, questionRoute);

//get single, all question routes middleware
app.use("/api/questions", authMiddleware, questionRoute);

//delete  or edit question  routes middleware
app.use("/api/questions", authMiddleware, questionRoute);

//post answers routes middleware
app.use("/api", authMiddleware, answerRoutes);

// get answers, delete, edit,rating answers  routes middleware
app.use("/api/answers", authMiddleware, answerRoutes);

//  post answer middleware
app.use("/api", authMiddleware, answerRoutes);

// admin routes middleware for user registration and  management
app.use("/api/admin", adminRoutes);

// 2. Admin Routes with Middleware for Questions
app.use("/api/admin/questions", adminQuestionRoutes);

//admin routes with middleware for answer delete and edit
app.use("/api/admin", adminAnswersRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

async function start() {
  try {
    const result = await dbConnection.execute("select 'test' ");
    app.listen(port);
    console.log("Database connection established");
    console.log(`listening on ${port} `);
  } catch (error) {
    console.log(error.message);
  }
}

start();
