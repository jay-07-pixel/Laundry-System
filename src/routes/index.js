import { Router } from "express";
import { login } from "../controllers/authController.js";
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} from "../controllers/orderController.js";
import { getDashboard } from "../controllers/dashboardController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "laundry-order-api", auth: "POST /auth/login" });
});

router.post("/auth/login", login);

router.get("/dashboard", verifyToken, getDashboard);
router.post("/orders", verifyToken, createOrder);
router.get("/orders", verifyToken, listOrders);
router.get("/orders/:id", getOrder);
router.put("/orders/:orderId/status", verifyToken, updateOrderStatus);
router.put("/orders/:id", updateOrder);
router.delete("/orders/:id", deleteOrder);

export default router;
