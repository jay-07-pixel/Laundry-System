import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { Order, ORDER_STATUSES } from "../models/Order.js";
import { toOrderResponse, toOrderResponseList } from "../utils/orderResponse.js";

function parseGarmentsInput(body) {
  const { garments } = body;
  if (!Array.isArray(garments)) {
    return { error: "garments must be an array" };
  }
  if (garments.length === 0) {
    return { error: "garments must not be empty" };
  }
  for (const g of garments) {
    if (!g || typeof g.type !== "string" || !g.type.trim()) {
      return { error: "Each garment must have a non-empty type" };
    }
    if (typeof g.quantity !== "number" || Number.isNaN(g.quantity) || g.quantity <= 0) {
      return { error: "Each garment must have quantity greater than 0" };
    }
    if (typeof g.price !== "number" || Number.isNaN(g.price) || g.price <= 0) {
      return { error: "Each garment must have price greater than 0" };
    }
  }
  return { garments };
}

async function findOrderByParamId(id) {
  if (mongoose.isValidObjectId(id)) {
    return Order.findById(id);
  }
  return Order.findOne({ orderId: id });
}

/** Resolve only by business orderId (not MongoDB _id) */
async function findOrderByOrderId(orderId) {
  if (orderId == null || String(orderId).trim() === "") {
    return null;
  }
  return Order.findOne({ orderId: String(orderId).trim() });
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

/** Phone: exactly 10 digits. Non-digits stripped; if more than 10 digits, last 10 are used (e.g. +91 prefix). */
function parsePhone10(phone) {
  if (phone == null || typeof phone !== "string") {
    return { error: "phone is required" };
  }
  let digits = phone.replace(/\D/g, "");
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  if (digits.length !== 10) {
    return { error: "phone must be exactly 10 digits" };
  }
  return { value: digits };
}

/**
 * POST /orders
 * Body: { customerName, phone, garments: [{ type, quantity, price }], status? }
 * - totalAmount = sum(quantity * price) — set in Order model (pre-validate)
 * - orderId = ORD-<uuid>
 * - status defaults to RECEIVED
 */
export async function createOrder(req, res) {
  const { customerName, phone, status } = req.body;
  if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
    return badRequest(res, "customerName is required");
  }
  const phoneOk = parsePhone10(phone);
  if (phoneOk.error) return badRequest(res, phoneOk.error);
  const parsed = parseGarmentsInput(req.body);
  if (parsed.error) return badRequest(res, parsed.error);
  if (status !== undefined && !ORDER_STATUSES.includes(status)) {
    return badRequest(res, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
  }
  try {
    const order = await Order.create({
      orderId: `ORD-${uuidv4()}`,
      customerName: customerName.trim(),
      phone: phoneOk.value,
      garments: parsed.garments,
      status: status ?? "RECEIVED",
    });
    return res.status(201).json(toOrderResponse(order));
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors)
        .map((e) => e.message)
        .join(" ");
      return badRequest(res, messages || "Validation failed");
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: "orderId already exists" });
    }
    throw err;
  }
}

/**
 * GET /orders
 * Optional filters (combined with AND):
 * - ?status=RECEIVED|PROCESSING|READY|DELIVERED — exact match
 * - ?search=... — case-insensitive match on customerName, phone, OR any garment `type`
 *
 * Examples:
 * - /orders?status=PROCESSING
 * - /orders?search=Jay
 * - /orders?status=READY&search=555
 * - /orders?search=Shirt
 *
 * (Alias: ?q= has the same effect as ?search=.)
 *
 * Sorted by createdAt descending. Response: toOrderResponseList (no _id, no __v).
 */
export async function listOrders(req, res) {
  const { status, search, q } = req.query;
  const filter = {};

  if (status != null && String(status).trim() !== "") {
    const s = String(status).trim();
    if (!ORDER_STATUSES.includes(s)) {
      return badRequest(res, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
    }
    filter.status = s;
  }

  let searchText = null;
  if (search != null && String(search).trim() !== "") {
    searchText = String(search).trim();
  } else if (q != null && String(q).trim() !== "") {
    searchText = String(q).trim();
  }

  if (searchText) {
    const regex = new RegExp(escapeRegExp(searchText), "i");
    filter.$or = [
      { customerName: regex },
      { phone: regex },
      { "garments.type": regex },
    ];
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
  return res.json(toOrderResponseList(orders, { stripMongoId: true }));
}

export async function getOrder(req, res) {
  const order = await findOrderByParamId(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(toOrderResponse(order));
}

export async function updateOrder(req, res) {
  const { customerName, phone, garments, status } = req.body;
  const order = await findOrderByParamId(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (customerName !== undefined) {
    if (typeof customerName !== "string" || !customerName.trim()) {
      return badRequest(res, "customerName must be a non-empty string");
    }
    order.customerName = customerName.trim();
  }
  if (phone !== undefined) {
    const phoneOk = parsePhone10(phone);
    if (phoneOk.error) return badRequest(res, phoneOk.error);
    order.phone = phoneOk.value;
  }
  if (garments !== undefined) {
    const parsed = parseGarmentsInput({ garments });
    if (parsed.error) return badRequest(res, parsed.error);
    order.garments = parsed.garments;
  }
  if (status !== undefined) {
    if (!ORDER_STATUSES.includes(status)) {
      return badRequest(res, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
    }
    order.status = status;
  }
  await order.save();
  return res.json(toOrderResponse(order));
}

/**
 * PUT /orders/:orderId/status
 * Body: { status } — must be RECEIVED | PROCESSING | READY | DELIVERED
 * Looks up the order by orderId only (not _id), updates status, returns updated order.
 */
export async function updateOrderStatus(req, res) {
  const { status: raw } = req.body;
  if (raw === undefined || raw === null) {
    return badRequest(res, "status is required in request body");
  }
  if (typeof raw !== "string" || !raw.trim()) {
    return badRequest(res, "status must be a non-empty string");
  }
  const status = raw.trim();
  if (!ORDER_STATUSES.includes(status)) {
    return badRequest(
      res,
      `Invalid status. Allowed values: ${ORDER_STATUSES.join(", ")}`
    );
  }
  const order = await findOrderByOrderId(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  order.status = status;
  await order.save();
  return res.json(toOrderResponse(order));
}

export async function deleteOrder(req, res) {
  const order = await findOrderByParamId(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  await order.deleteOne();
  return res.status(204).send();
}
