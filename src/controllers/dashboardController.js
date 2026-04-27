import { getDashboardStats } from "../aggregations/getDashboardStats.js";

/**
 * GET /dashboard
 * MongoDB aggregation (see getDashboardStats): totals + per-status counts in one pipeline.
 *
 * @returns {Promise<{
 *   totalOrders: number;
 *   totalRevenue: number;
 *   ordersPerStatus: {
 *     RECEIVED: number;
 *     PROCESSING: number;
 *     READY: number;
 *     DELIVERED: number;
 *   };
 * }>}
 */
export async function getDashboard(_req, res) {
  const data = await getDashboardStats();
  return res.json(data);
}