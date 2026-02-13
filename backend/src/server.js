require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

app.get("/", (req, res) => {
  res.send("CP Platform Backend Running");
});

const PORT = process.env.PORT || 5000;

app.use("/api/problems", require("./routes/problemRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/submissions", require("./routes/submissionRoutes"));


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

