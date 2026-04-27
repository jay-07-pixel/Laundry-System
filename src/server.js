import "dotenv/config";
import connectDB from "./config/db.js";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

try {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Laundry API listening on http://localhost:${PORT}`);
  });
} catch (e) {
  console.error("Failed to start:", e.message);
  process.exit(1);
}
