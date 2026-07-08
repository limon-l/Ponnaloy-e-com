function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server." });
}

module.exports = errorHandler;
