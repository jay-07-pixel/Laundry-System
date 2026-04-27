import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "./api/client";
import { getToken } from "./api/authStorage";
import { login as apiLogin, logout as apiLogout } from "./api/authApi";
import {
  createOrder as postOrder,
  fetchDashboard,
  fetchOrders,
  updateOrderStatus as putOrderStatus,
} from "./api/ordersApi";
import {
  GARMENT_CATALOG,
  GARMENT_OTHER,
  getDefaultPrice,
  getGarmentName,
} from "./data/garmentCatalog";
import "./App.css";

const STATUSES = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];

/** Keep only digits; max 10. If more than 10 (e.g. pasted +91…), use last 10. */
function sanitizePhoneInput(value) {
  let d = String(value ?? "").replace(/\D/g, "");
  if (d.length > 10) d = d.slice(-10);
  return d;
}

const emptyGarment = () => ({
  itemId: "",
  otherName: "",
  quantity: "1",
  price: "",
});

function formatEstDelivery(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Line subtotal for saved order garment (API returns numbers). */
function formatOrderGarmentLine(g) {
  const p = Number(g.price);
  const q = Number(g.quantity);
  if (!Number.isFinite(p) || !Number.isFinite(q) || q <= 0 || p <= 0) {
    return `${g.type ?? "—"}`;
  }
  const line = p * q;
  return `${g.type} × ${q} @ ${p.toFixed(2)} each = ${line.toFixed(2)}`;
}

/** e.g. "4.00 rs × 2 quantity = 8.00 rs" */
function formatGarmentLineTotal(g) {
  const p = Number(g.price);
  const q = Number(g.quantity);
  if (!Number.isFinite(p) || !Number.isFinite(q) || q <= 0 || p <= 0) {
    return "—";
  }
  const total = p * q;
  return `${p.toFixed(2)} rs × ${q} quantity = ${total.toFixed(2)} rs`;
}

/** CSS class for colored status pill (RECEIVED, PROCESSING, …). */
function statusBadgeClass(status) {
  const key = String(status || "").toLowerCase();
  if (["received", "processing", "ready", "delivered"].includes(key)) {
    return `badge badge--${key}`;
  }
  return "badge";
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [authed, setAuthed] = useState(() => !!getToken());
  const [loading, setLoading] = useState(() => !!getToken());
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    garments: [emptyGarment()],
  });
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [loginEmail, setLoginEmail] = useState("admin@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  useEffect(() => {
    const h = () => setAuthed(false);
    window.addEventListener("laundry-auth-lost", h);
    return () => window.removeEventListener("laundry-auth-lost", h);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setOrderSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  /** Fetches dashboard + orders together (orders respect `orderSearch` → GET /orders?search= name/phone/garment). */
  const loadOrdersAndDashboard = useCallback(async () => {
    const [dash, list] = await Promise.all([
      fetchDashboard(),
      fetchOrders({ search: orderSearch || undefined }),
    ]);
    setDashboard(dash);
    setOrders(list);
  }, [orderSearch]);

  const refresh = useCallback(async () => {
    setError("");
    try {
      await loadOrdersAndDashboard();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [loadOrdersAndDashboard]);

  /** After create or status change: always refetch both dashboard and orders list. */
  const reloadAfterMutation = useCallback(async () => {
    setError("");
    setSyncing(true);
    try {
      await loadOrdersAndDashboard();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSyncing(false);
    }
  }, [loadOrdersAndDashboard]);

  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    refresh();
  }, [authed, refresh]);

  const setField = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setGarment = (index, field, value) => {
    setForm((f) => {
      const garments = [...f.garments];
      garments[index] = { ...garments[index], [field]: value };
      return { ...f, garments };
    });
  };

  const handleGarmentItemChange = (index, itemId) => {
    setForm((f) => {
      const garments = [...f.garments];
      const g = { ...garments[index], itemId };
      if (itemId === "") {
        g.price = "";
        g.otherName = "";
      } else if (itemId === GARMENT_OTHER) {
        g.otherName = g.otherName || "";
        g.price = "";
      } else {
        const d = getDefaultPrice(itemId);
        g.price = d != null ? String(d) : "";
        g.otherName = "";
      }
      garments[index] = g;
      return { ...f, garments };
    });
  };

  const addGarmentRow = () =>
    setForm((f) => ({ ...f, garments: [...f.garments, emptyGarment()] }));

  const removeGarmentRow = (index) => {
    if (form.garments.length <= 1) return;
    setForm((f) => ({
      ...f,
      garments: f.garments.filter((_, i) => i !== index),
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (form.phone.length !== 10) {
      setError("Phone must be exactly 10 digits.");
      return;
    }
    const garments = form.garments.map((g) => ({
      type: getGarmentName(g.itemId, g.otherName),
      quantity: Number(g.quantity),
      price: Number(g.price),
    }));
    for (const g of garments) {
      if (!g.type) {
        setError("Select a garment or enter a name for “Other”.");
        return;
      }
      if (!Number.isFinite(g.quantity) || g.quantity <= 0) {
        setError("Quantity must be a number greater than 0.");
        return;
      }
      if (!Number.isFinite(g.price) || g.price <= 0) {
        setError("Price must be a number greater than 0.");
        return;
      }
    }
    setSubmitting(true);
    try {
      await postOrder({
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        garments,
      });
      setForm({ customerName: "", phone: "", garments: [emptyGarment()] });
      await reloadAfterMutation();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    setError("");
    try {
      await putOrderStatus(orderId, status);
      await reloadAfterMutation();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoginSubmitting(true);
    try {
      apiLogout();
      await apiLogin(loginEmail.trim(), loginPassword);
      setLoading(true);
      setAuthed(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    apiLogout();
    setAuthed(false);
    setDashboard(null);
    setOrders([]);
    setError("");
  };

  if (!authed) {
    return (
      <div className="app">
        <h1>Laundry orders</h1>
        {error && <p className="error">{error}</p>}
        <section className="card">
          <h2>Sign in</h2>
          <p className="muted">Use your admin credentials to access the dashboard and orders.</p>
          <form onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <div className="actions">
              <button type="submit" className="btn" disabled={loginSubmitting}>
                {loginSubmitting ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Laundry orders</h1>
        <button type="button" className="btn secondary" onClick={handleLogout}>
          Log out
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {syncing && (
        <p className="muted" role="status">
          Updating orders list and dashboard…
        </p>
      )}

      <section className="card">
        <h2>Dashboard</h2>
        {loading && !dashboard ? (
          <p>Loading…</p>
        ) : dashboard ? (
          <div className="dashboard-grid">
            <div>
              <strong>Total orders</strong>
              <div>{dashboard.totalOrders}</div>
            </div>
            <div>
              <strong>Total revenue</strong>
              <div>{Number(dashboard.totalRevenue).toFixed(2)}</div>
            </div>
            {STATUSES.map((s) => (
              <div key={s}>
                <strong>{s}</strong>
                <div>{dashboard.ordersPerStatus?.[s] ?? 0}</div>
              </div>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="btn secondary"
          onClick={refresh}
          disabled={syncing}
        >
          Refresh
        </button>
      </section>

      <section className="card">
        <h2>Create order</h2>
        <form onSubmit={handleCreate}>
          <label>
            Name
            <input
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
              required
            />
          </label>
          <label>
            Phone (10 digits)
            <input
              type="text"
              inputMode="numeric"
              autoComplete="tel"
              name="phone"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={(e) => setField("phone", sanitizePhoneInput(e.target.value))}
              minLength={10}
              maxLength={10}
              pattern="\d{10}"
              title="Enter exactly 10 digits"
              required
            />
          </label>
          <p className="muted">Garments — price is per item (rs), total = price × quantity.</p>
          <div className="garment-table" role="group" aria-label="Order garments">
            <div className="garment-table-row garment-table-header">
              <div className="garment-cell garment-cell-main">Garment</div>
              <div className="garment-cell garment-cell-narrow">Qty</div>
              <div className="garment-cell garment-cell-narrow">Price (rs)</div>
              <div className="garment-cell garment-cell-total">Total</div>
              <div className="garment-cell garment-cell-action" />
            </div>
            {form.garments.map((g, i) => (
              <div className="garment-table-row" key={i}>
                <div className="garment-cell garment-cell-main">
                  <select
                    className="garment-select"
                    value={g.itemId}
                    onChange={(e) => handleGarmentItemChange(i, e.target.value)}
                    required
                    aria-label="Garment"
                  >
                    <option value="">— Select —</option>
                    {GARMENT_CATALOG.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.price.toFixed(2)})
                      </option>
                    ))}
                    <option value={GARMENT_OTHER}>Other (type below)</option>
                  </select>
                  {g.itemId === GARMENT_OTHER && (
                    <input
                      className="garment-other"
                      placeholder="Describe garment"
                      value={g.otherName}
                      onChange={(e) => setGarment(i, "otherName", e.target.value)}
                      required
                    />
                  )}
                </div>
                <div className="garment-cell garment-cell-narrow">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Qty"
                    value={g.quantity}
                    onChange={(e) => setGarment(i, "quantity", e.target.value)}
                    required
                    aria-label="Quantity"
                  />
                </div>
                <div className="garment-cell garment-cell-narrow">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Price"
                    value={g.price}
                    onChange={(e) => setGarment(i, "price", e.target.value)}
                    required
                    title="Default from catalog; you can change it"
                    aria-label="Price per item in rs"
                  />
                </div>
                <div
                  className="garment-cell garment-cell-total garment-line-total"
                  title="Line total"
                >
                  {formatGarmentLineTotal(g)}
                </div>
                <div className="garment-cell garment-cell-action">
                  {form.garments.length > 1 && (
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => removeGarmentRow(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="btn secondary" onClick={addGarmentRow}>
              Add garment
            </button>
            <button type="submit" className="btn" disabled={submitting || syncing}>
              {submitting ? "Saving…" : "Create order"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Orders</h2>
        <label className="search-row">
          <span className="muted">Search by name, phone, or garment</span>
          <input
            type="search"
            className="search-input"
            placeholder="Type to filter…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
            disabled={syncing}
          />
        </label>
        {loading && orders.length === 0 ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <p className="muted">
            {orderSearch
              ? "No orders match your search."
              : "No orders yet."}
          </p>
        ) : (
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.orderId} className="order-item">
                <div className="order-head">
                  <span className="mono">{o.orderId}</span>
                  <span>
                    {o.customerName} · {o.phone}
                  </span>
                  <span className={statusBadgeClass(o.status)}>{o.status}</span>
                  <span>Total: {Number(o.totalAmount).toFixed(2)}</span>
                  <span title="Estimated delivery" className="order-est">
                    Est. delivery: {formatEstDelivery(o.estimatedDeliveryDate)}
                  </span>
                </div>
                <ul className="garment-list">
                  {(o.garments || []).map((g, idx) => (
                    <li key={idx}>{formatOrderGarmentLine(g)}</li>
                  ))}
                </ul>
                <div className="status-actions">
                  <span>Update status:</span>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn small ${o.status === s ? "active" : ""}`}
                      onClick={() => updateStatus(o.orderId, s)}
                      disabled={o.status === s || syncing}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
