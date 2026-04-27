/**
 * Shapes a single order for JSON: strips __v (works for Mongoose docs, lean() objects, POJOs).
 */
export function toOrderResponse(doc) {
  if (doc == null) return doc;
  if (typeof doc.toJSON === "function") {
    return doc.toJSON();
  }
  if (typeof doc === "object" && !Array.isArray(doc)) {
    const { __v, ...rest } = doc;
    return rest;
  }
  return doc;
}

/**
 * @param {unknown[]} orders
 * @param {{ stripMongoId?: boolean }} [options] — if stripMongoId, removes _id and __v (for GET /orders list)
 */
export function toOrderResponseList(orders, options = {}) {
  if (!Array.isArray(orders)) return orders;
  const { stripMongoId = false } = options;
  return orders.map((o) => {
    const row = toOrderResponse(o);
    if (!stripMongoId || row == null || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }
    const { _id, __v, ...rest } = row;
    return rest;
  });
}
