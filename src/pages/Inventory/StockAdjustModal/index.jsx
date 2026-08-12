import { useState, useEffect } from "react";
import { Modal, Radio, message } from "antd";
import { PlusCircleOutlined, MinusCircleOutlined, SwapOutlined } from "@ant-design/icons";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { formatCurrency } from "@/utils";
import { STOCK_IN_REASONS, STOCK_OUT_REASONS } from "../mockData";
import styles from "./styles.module.css";

const IN_REASONS  = STOCK_IN_REASONS.map((r)  => ({ value: r, label: r }));
const OUT_REASONS = STOCK_OUT_REASONS.map((r) => ({ value: r, label: r }));

const fresh = { qty: "", reason: null, date: new Date().toISOString().slice(0, 10), notes: "" };

const StockAdjustModal = ({ open, onClose, item, defaultType = "in", onAdjust }) => {
  const [type, setType] = useState(defaultType);
  const [form, setForm] = useState(fresh);

  useEffect(() => {
    if (open) { setType(defaultType); setForm(fresh); }
  }, [open, defaultType]);

  if (!item) return null;

  const qty          = Number(form.qty) || 0;
  const stockAfter   = type === "in" ? item.currentStock + qty : Math.max(0, item.currentStock - qty);
  const isOverdrawn  = type === "out" && qty > item.currentStock;

  const handleSubmit = () => {
    if (!qty || qty <= 0)    { message.warning("Enter a valid quantity"); return; }
    if (!form.reason)        { message.warning("Please select a reason"); return; }
    if (!form.date)          { message.warning("Please select a date"); return; }
    if (isOverdrawn)         { message.warning(`Cannot deduct more than current stock (${item.currentStock} ${item.unit})`); return; }

    onAdjust({
      itemId:     item.id,
      type,
      qty,
      reason:     form.reason,
      date:       form.date,
      notes:      form.notes,
      stockBefore: item.currentStock,
      stockAfter,
    });

    message.success(
      type === "in"
        ? `${qty} ${item.unit} added — stock is now ${stockAfter}`
        : `${qty} ${item.unit} removed — stock is now ${stockAfter}`
    );
    onClose();
  };

  const isIn = type === "in";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
      destroyOnClose
      closable={false}
      styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.itemAvatar} style={{ background: isIn ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)" }}>
            <SwapOutlined style={{ color: isIn ? "#22c55e" : "#f97316", fontSize: 18 }} />
          </div>
          <div>
            <h2 className={styles.title}>Adjust Stock</h2>
            <p className={styles.subtitle}>{item.itemCode} &nbsp;·&nbsp; {item.name}</p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>
        {/* Current stock info */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Current Stock", value: `${item.currentStock} ${item.unit}`, color: item.currentStock === 0 ? "#ef4444" : item.currentStock <= item.minStock ? "#f97316" : "#22c55e", bg: item.currentStock === 0 ? "rgba(239,68,68,0.07)" : item.currentStock <= item.minStock ? "rgba(249,115,22,0.07)" : "rgba(34,197,94,0.07)", border: item.currentStock === 0 ? "rgba(239,68,68,0.2)" : item.currentStock <= item.minStock ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)" },
            { label: "Purchase Rate", value: formatCurrency(item.purchaseRate), color: "#64748b", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.2)" },
            { label: "Sale Rate",     value: formatCurrency(item.saleRate),     color: "#7c5cfc", bg: "rgba(124,92,252,0.07)",  border: "rgba(124,92,252,0.2)" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ flex: 1, padding: "10px 12px", borderRadius: 9, background: bg, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color, letterSpacing: "0.4px" }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color, marginTop: 3 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* In / Out toggle */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
            Adjustment Type
          </label>
          <Radio.Group value={type} onChange={(e) => setType(e.target.value)} style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Radio.Button value="in" style={{ flex: 1, textAlign: "center", height: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700, borderRadius: 8 }}>
                <PlusCircleOutlined style={{ color: "#22c55e" }} /> Stock In
              </Radio.Button>
              <Radio.Button value="out" style={{ flex: 1, textAlign: "center", height: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700, borderRadius: 8 }}>
                <MinusCircleOutlined style={{ color: "#f97316" }} /> Stock Out
              </Radio.Button>
            </div>
          </Radio.Group>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <AppInput
              inputType="number"
              label={`Quantity (${item.unit}) *`}
              placeholder="0"
              min={1}
              value={form.qty}
              onChange={(v) => setForm((f) => ({ ...f, qty: v }))}
            />
            <AppInput
              inputType="date"
              label="Date *"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <AppSelect
            label="Reason *"
            placeholder="Select reason"
            options={isIn ? IN_REASONS : OUT_REASONS}
            value={form.reason}
            onChange={(v) => setForm((f) => ({ ...f, reason: v }))}
          />

          <AppInput
            label="Notes"
            placeholder="Optional — supplier name, reference, etc."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {/* After adjustment preview */}
        {qty > 0 && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 10,
            background: isOverdrawn ? "rgba(239,68,68,0.08)" : isIn ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.08)",
            border: `1.5px solid ${isOverdrawn ? "rgba(239,68,68,0.3)" : isIn ? "rgba(34,197,94,0.3)" : "rgba(249,115,22,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {item.currentStock} {item.unit} &nbsp;
              <span style={{ fontWeight: 800, color: isIn ? "#22c55e" : "#f97316" }}>
                {isIn ? `+ ${qty}` : `− ${qty}`}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: isOverdrawn ? "#ef4444" : isIn ? "#22c55e" : "#f97316" }}>
              = {stockAfter} {item.unit}
              {isOverdrawn && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 6 }}>⚠ Exceeds stock!</span>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <AppButton onClick={onClose}>Cancel</AppButton>
          <AppButton
            type="primary"
            onClick={handleSubmit}
            className="btn-dark"
            style={{ minWidth: 130 }}
            icon={isIn ? <PlusCircleOutlined /> : <MinusCircleOutlined />}
          >
            {isIn ? "Add Stock" : "Remove Stock"}
          </AppButton>
        </div>
      </div>
    </Modal>
  );
};

export default StockAdjustModal;
