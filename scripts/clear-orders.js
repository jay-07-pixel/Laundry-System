/**
 * Deletes all documents in the `orders` collection.
 * Run from project root: npm run clear-orders
 * Requires MONGO_URI in .env (same as the API).
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import { Order } from "../src/models/Order.js";

try {
  await connectDB();
  const { deletedCount } = await Order.deleteMany({});
  console.log(`Removed ${deletedCount} order(s).`);
} catch (e) {
  console.error(e.message || e);
  process.exitCode = 1;
} finally {
  await mongoose.connection.close().catch(() => {});
}
