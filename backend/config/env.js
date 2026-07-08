const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/ponnaloy",
  sessionSecret: process.env.SESSION_SECRET || "ponnaloy-store-secret",
  openaiApiKey: process.env.OPENAI_API_KEY || null,
};
