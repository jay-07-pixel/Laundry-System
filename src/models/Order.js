import mongoose from "mongoose";

export const ORDER_STATUSES = [
  "RECEIVED",
  "PROCESSING",
  "READY",
  "DELIVERED",
];

const garmentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => Number.isFinite(v) && v > 0,
        message: "quantity must be greater than 0",
      },
    },
    price: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => Number.isFinite(v) && v > 0,
        message: "price must be greater than 0",
      },
    },
  },
  { _id: false }
);

/** Sum of garment quantities (total item count). */
function computeTotalGarmentQuantity(garments) {
  if (!Array.isArray(garments) || garments.length === 0) return 0;
  return garments.reduce((sum, g) => {
    const q = Number(g.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
}

/**
 * Base 1 day + 1 extra day per every 3 garments (by total quantity).
 * e.g. 1–2 qty → 1 day; 3–5 → 2 days; 6–8 → 3 days; 9–11 → 4 days.
 */
function computeDeliveryOffsetDays(garments) {
  const totalQty = computeTotalGarmentQuantity(garments);
  if (totalQty < 1) return 1;
  return 1 + Math.floor(totalQty / 3);
}

/** sum of (quantity * price) for each line item; always set from garments before validation */
function computeTotalFromGarments(garments) {
  if (!Array.isArray(garments) || garments.length === 0) return 0;
  return garments.reduce((sum, g) => {
    const q = g.quantity;
    const p = g.price;
    return sum + Number(q) * Number(p);
  }, 0);
}

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, "phone must be exactly 10 digits"],
    },
    garments: {
      type: [garmentSchema],
      required: true,
      validate: [(v) => Array.isArray(v) && v.length > 0, "At least one garment required"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: [true, "status is required"],
      trim: true,
      enum: {
        values: ORDER_STATUSES,
        message:
          "status must be one of: RECEIVED, PROCESSING, READY, DELIVERED",
      },
      default: "RECEIVED",
    },
    estimatedDeliveryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { versionKey: false },
  }
);

orderSchema.pre("validate", function (next) {
  this.totalAmount = computeTotalFromGarments(this.garments);
  if (typeof this.status === "string") {
    this.status = this.status.trim();
  }
  next();
});

orderSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("garments")) {
    const days = computeDeliveryOffsetDays(this.garments);
    const d = new Date();
    d.setDate(d.getDate() + days);
    this.estimatedDeliveryDate = d;
  }
  next();
});

export const Order = mongoose.model("Order", orderSchema);
export { computeTotalFromGarments, computeTotalGarmentQuantity, computeDeliveryOffsetDays };
