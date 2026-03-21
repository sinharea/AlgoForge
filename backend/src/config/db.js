const mongoose = require("mongoose");
const { mongoUri } = require("./env");

const connectDb = async () => {
  await mongoose.connect(mongoUri);
};

module.exports = connectDb;
