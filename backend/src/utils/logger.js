const log = (level, message, meta) => {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
};

module.exports = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};
