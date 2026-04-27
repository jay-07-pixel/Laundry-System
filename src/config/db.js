import "dotenv/config";
import mongoose from "mongoose";

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MongoDB connection error: MONGO_URI is not set in environment");
    throw new Error("MONGO_URI is not set");
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
}

export default connectDB;
