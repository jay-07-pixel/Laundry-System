import { Order, ORDER_STATUSES } from "../models/Order.js";

/**
 * GET /dashboard — MongoDB aggregation pipeline (single $facet):
 * - summary: $group all docs → totalOrders (count), totalRevenue (sum of totalAmount)
 * - byStatus: $group by status → counts merged into ordersPerStatus (all 4 keys always present)
 */
export async function getDashboardStats() {  const [facet] = await Order.aggregate([
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            },
          },
        ],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
      },
    },
  ]);

  const summary = facet?.summary?.[0];
  const totalOrders = summary?.totalOrders ?? 0;
  const totalRevenue = summary?.totalRevenue ?? 0;

  const ordersPerStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const row of facet?.byStatus ?? []) {
    if (row._id != null && row._id in ordersPerStatus) {
      ordersPerStatus[row._id] = row.count;
    }
  }

  return { totalOrders, totalRevenue, ordersPerStatus };
}
