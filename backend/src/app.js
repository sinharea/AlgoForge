const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { passport } = require("./controllers/oauthController");

const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { corsOrigin, nodeEnv } = require("./config/env");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(nodeEnv === "production" ? "combined" : "dev"));
app.use(passport.initialize());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
