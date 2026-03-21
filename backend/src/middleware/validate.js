module.exports = (schema, property = "body") => (req, res, next) => {
  req[property] = schema.parse(req[property]);
  next();
};
