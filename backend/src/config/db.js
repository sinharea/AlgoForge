const mongoose = require("mongoose");
const { mongoUri } = require("./env");

const connectDb = async () => {
  try {
    await mongoose.connect(mongoUri);
    // eslint-disable-next-line no-console
    console.log("MongoDB connection initiated");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection failed:", error.message);
    throw error; // Re-throw to let caller handle it
  }
};

module.exports = connectDb;
