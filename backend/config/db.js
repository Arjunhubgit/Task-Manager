const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // For development on restricted network, use local MongoDB
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/taskmanager";
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
  }
};

module.exports = connectDB;