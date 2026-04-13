const app = require("./app");
const connectDb = require("./config/db");
const { port } = require("./config/env");


const logger = require("./utils/logger");

const start = async () => {
  await connectDb();
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${port}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Startup failed:", error.message);
  process.exit(1);
});
