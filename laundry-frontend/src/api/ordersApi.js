import client from "./client";

/**
 * GET /dashboard — totals and counts per status
 */
export async function fetchDashboard() {
  const { data } = await client.get("/dashboard");
  return data;
}

/**
 * GET /orders — optional ?search= (matches customer name, phone, or garment type)
 */
export async function fetchOrders(params = {}) {
  const { search } = params;
  const sp = new URLSearchParams();
  if (search != null && String(search).trim() !== "") {
    sp.set("search", String(search).trim());
  }
  const qs = sp.toString();
  const url = qs ? `/orders?${qs}` : "/orders";
  const { data } = await client.get(url);
  return Array.isArray(data) ? data : [];
}

/**
 * POST /orders — create order
 * @param {{ customerName: string; phone: string; garments: Array<{ type: string; quantity: number; price: number }> }} body
 */
export async function createOrder(body) {
  const { data } = await client.post("/orders", body);
  return data;
}

/**
 * PUT /orders/:orderId/status — update status by business orderId
 */
export async function updateOrderStatus(orderId, status) {
  const { data } = await client.put(
    `/orders/${encodeURIComponent(orderId)}/status`,
    { status }
  );
  return data;
}
