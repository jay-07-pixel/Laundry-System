/** Preset clothes for the create-order form: default price (editable in UI). */
export const GARMENT_CATALOG = [
  { id: "shirt", name: "Shirt", price: 5.0 },
  { id: "tshirt", name: "T-shirt", price: 4.5 },
  { id: "pants", name: "Pants", price: 8.0 },
  { id: "jeans", name: "Jeans", price: 10.0 },
  { id: "saree", name: "Saree", price: 18.0 },
  { id: "salwar", name: "Salwar kameez", price: 14.0 },
  { id: "kurta", name: "Kurta", price: 7.0 },
  { id: "blouse", name: "Blouse", price: 3.5 },
  { id: "skirt", name: "Skirt", price: 6.0 },
  { id: "dress", name: "Dress", price: 12.0 },
  { id: "jacket", name: "Coat / jacket", price: 15.0 },
  { id: "bedsheet", name: "Bed sheet", price: 9.0 },
];

export const GARMENT_OTHER = "other";

export function getGarmentName(itemId, otherName) {
  if (itemId === GARMENT_OTHER) {
    return String(otherName || "").trim();
  }
  if (!itemId) return "";
  const row = GARMENT_CATALOG.find((g) => g.id === itemId);
  return row ? row.name : "";
}

export function getDefaultPrice(itemId) {
  if (!itemId || itemId === GARMENT_OTHER) return null;
  const row = GARMENT_CATALOG.find((g) => g.id === itemId);
  return row ? row.price : null;
}
