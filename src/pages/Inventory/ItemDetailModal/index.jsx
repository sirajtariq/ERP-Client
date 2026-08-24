import { useState } from "react";
import { Modal, Tag } from "antd";
import {
  BoxPlotOutlined, PlusCircleOutlined, MinusCircleOutlined,
  DollarOutlined, BarChartOutlined, HistoryOutlined,
} from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency } from "@/utils";
import StockHistoryModal from "../StockHistoryModal";
import styles from "./styles.module.css";

const STATUS_MAP = {
  in_stock:     { label: "In Stock",     color: "success", text: "#22c55e" },
  low_stock:    { label: "Low Stock",    color: "warning", text: "#f97316" },
  out_of_stock: { label: "Out of Stock", color: "error",   text: "#ef4444" },
};

const val = (v, fallback = "--") => (v !== undefined && v !== null && v !== "") ? v : fallback;

const StatCard = ({ label, value, color, bg, border }) => (
  <div style={{ flex: 1, padding: "12px 14px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value ?? "—"}</span>
  </div>
);

const ItemDetailModal = ({ open, onClose, item, onStockIn, onStockOut }) => {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!item) return null;

  const isService        = item.itemType === "service";
  const st               = STATUS_MAP[item.stockStatus] || STATUS_MAP["in_stock"];
  const totalIn         = Number(item.totalIn       ?? 0);
  const totalOut        = Number(item.totalOut      ?? 0);
  const profitPerUnit   = Number(item.profitPerUnit ?? item.profitPerItem ?? 0);
  const margin          = Number(item.profitMargin  ?? 0);
  const purchaseValue   = Number(item.stockValue)       || 0;
  const saleValue       = Number(item.saleValue)        || 0;
  const potentialProfit = Number(item.potentialProfit)  || 0;
  const totalInvested   = Number(item.totalInvested)    || 0;
  const realizedRevenue = Number(item.revenueFromSales) || 0;
  const realizedProfit  = Number(item.realizedProfit)   || 0;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width="90vw"
        centered
        destroyOnClose
        closable={false}
        className={styles.modal}
        styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              <BoxPlotOutlined style={{ fontSize: 22, color: "#7c5cfc" }} />
            </div>
            <div>
              <h2 className={styles.name}>{item.name}</h2>
              <p className={styles.sub}>
                {item.itemCode} &nbsp;·&nbsp; {item.category} &nbsp;·&nbsp; {item.unit}
              </p>
              {isService ? (
                <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600, marginTop: 4, fontSize: 11 }}>
                  Service
                </Tag>
              ) : (
                <Tag color={st.color} style={{ borderRadius: 6, fontWeight: 600, marginTop: 4, fontSize: 11 }}>
                  {st.label}
                </Tag>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isService && (
              <>
                <AppButton
                  size="small"
                  icon={<PlusCircleOutlined />}
                  style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.07)" }}
                  onClick={() => { onClose(); onStockIn(item); }}
                >
                  Stock In
                </AppButton>
                <AppButton
                  size="small"
                  icon={<MinusCircleOutlined />}
                  style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.4)", background: "rgba(249,115,22,0.07)" }}
                  onClick={() => { onClose(); onStockOut(item); }}
                >
                  Stock Out
                </AppButton>
                <AppButton
                  size="small"
                  icon={<HistoryOutlined />}
                  style={{
                    color: "#fff",
                    borderColor: "#7c5cfc",
                    background: "linear-gradient(135deg, #7c5cfc 0%, #5b3de8 100%)",
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(124,92,252,0.45)",
                  }}
                  onClick={() => setHistoryOpen(true)}
                >
                  Stock History
                </AppButton>
              </>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Summary stat cards */}
          <div style={{ display: "flex", gap: 10, padding: "16px 24px 4px" }}>
            {isService ? (
              <>
                <StatCard label="Cost Rate"     value={formatCurrency(item.purchaseRate)}    color="#64748b"  bg="rgba(100,116,139,0.07)"  border="rgba(100,116,139,0.2)" />
                <StatCard label="Billing Rate"  value={formatCurrency(item.saleRate)}         color="#7c5cfc"  bg="rgba(124,92,252,0.07)"   border="rgba(124,92,252,0.2)" />
                <StatCard label="Profit / Item" value={formatCurrency(profitPerUnit)}         color="#22c55e"  bg="rgba(34,197,94,0.07)"    border="rgba(34,197,94,0.2)" />
                <StatCard label="Profit Margin" value={`${Number(margin).toFixed(1)}%`}       color={Number(margin) >= 20 ? "#22c55e" : Number(margin) >= 10 ? "#f97316" : "#ef4444"} bg="rgba(34,197,94,0.07)" border="rgba(34,197,94,0.2)" />
              </>
            ) : (
              <>
                <StatCard label="Current Stock"    value={`${item.currentStock} ${item.unit}`} color={st.text}  bg={`${st.text}12`}              border={`${st.text}30`} />
                <StatCard label="Stock Value"        value={formatCurrency(purchaseValue)}        color="#64748b"  bg="rgba(100,116,139,0.07)"       border="rgba(100,116,139,0.2)" />
                <StatCard label="Sale Value"       value={formatCurrency(saleValue)}            color="#7c5cfc"  bg="rgba(124,92,252,0.07)"        border="rgba(124,92,252,0.2)" />
                <StatCard label="Potential Profit" value={formatCurrency(potentialProfit)}      color="#22c55e"  bg="rgba(34,197,94,0.07)"         border="rgba(34,197,94,0.2)" />
                <StatCard label="Profit Margin"    value={`${Number(margin).toFixed(1)}%`}      color={Number(margin) >= 20 ? "#22c55e" : Number(margin) >= 10 ? "#f97316" : "#ef4444"} bg="rgba(34,197,94,0.07)" border="rgba(34,197,94,0.2)" />
              </>
            )}
          </div>

          <div style={{ padding: "12px 24px 24px" }}>
            {/* Item details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div className={styles.infoBox}>
                <div className={styles.boxTitle}><BarChartOutlined style={{ marginRight: 6 }} />Item Info</div>
                <InfoRow label="Item Code"   value={val(item.itemCode)} />
                <InfoRow label="Category"    value={val(item.category)} />
                <InfoRow label="Unit"        value={val(item.unit)} />
                {!isService && (
                  <InfoRow label="Min Stock" value={item.minStock != null ? `${item.minStock} ${item.unit}` : "--"} />
                )}
                <InfoRow label="Description" value={val(item.description)} />
              </div>
              <div className={styles.infoBox}>
                {isService ? (
                  <>
                    <div className={styles.boxTitle}><DollarOutlined style={{ marginRight: 6 }} />Pricing</div>
                    <InfoRow label="Cost Rate"     value={formatCurrency(item.purchaseRate)} />
                    <InfoRow label="Billing Rate"  value={formatCurrency(item.saleRate)} />
                    <InfoRow label="Profit / Item" value={<span style={{ color: "#22c55e", fontWeight: 700 }}>{formatCurrency(profitPerUnit)}</span>} />
                    <InfoRow label="Profit Margin" value={<span style={{ color: Number(margin) >= 20 ? "#22c55e" : Number(margin) >= 10 ? "#f97316" : "#ef4444", fontWeight: 700 }}>{Number(margin).toFixed(1)}%</span>} />
                  </>
                ) : (
                  <>
                    <div className={styles.boxTitle}><DollarOutlined style={{ marginRight: 6 }} />Stock Summary</div>
                    <InfoRow label="Opening Stock" value={item.openingStock != null ? `${item.openingStock} ${item.unit}` : "--"} />
                    <InfoRow label="Total In"      value={<span style={{ color: "#22c55e", fontWeight: 700 }}>{totalIn} {item.unit}</span>} />
                    <InfoRow label="Total Out"     value={<span style={{ color: "#f97316", fontWeight: 700 }}>{totalOut} {item.unit}</span>} />
                    <InfoRow label="Current Stock" value={<span style={{ color: st.text, fontWeight: 800 }}>{item.currentStock} {item.unit}</span>} />
                    <InfoRow label="Profit / Item" value={<span style={{ color: "#22c55e", fontWeight: 700 }}>+{formatCurrency(profitPerUnit)}</span>} />
                  </>
                )}
              </div>
            </div>

            {/* Stock Value Analysis — not applicable to service items (no stock quantity) */}
            {!isService && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>
                <DollarOutlined style={{ marginRight: 6, color: "#7c5cfc" }} />
                Stock Value Analysis
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(100,116,139,0.07)", border: "1px solid rgba(100,116,139,0.2)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "#64748b", marginBottom: 6 }}>Stock Value</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#475569" }}>{formatCurrency(purchaseValue)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{item.currentStock} {item.unit} × {formatCurrency(item.purchaseRate)}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(124,92,252,0.07)", border: "1px solid rgba(124,92,252,0.2)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "#7c5cfc", marginBottom: 6 }}>Sale Value</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#7c5cfc" }}>{formatCurrency(saleValue)}</div>
                  <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>{item.currentStock} {item.unit} × {formatCurrency(item.saleRate)}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 10, background: potentialProfit >= 0 ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${potentialProfit >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: potentialProfit >= 0 ? "#16a34a" : "#dc2626", marginBottom: 6 }}>Potential Profit</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: potentialProfit >= 0 ? "#22c55e" : "#ef4444" }}>{formatCurrency(potentialProfit)}</div>
                  <div style={{ fontSize: 11, color: "#86efac", marginTop: 4 }}>if all {item.currentStock} {item.unit} sold</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Purchase Rate / Unit", value: formatCurrency(item.purchaseRate), color: "#64748b" },
                  { label: "Sale Rate / Unit",      value: formatCurrency(item.saleRate),     color: "#7c5cfc" },
                  { label: "Profit / Unit",         value: `+${formatCurrency(profitPerUnit)}`, color: "#22c55e" },
                  { label: "Profit Margin",         value: `${Number(margin).toFixed(1)}%`,   color: Number(margin) >= 20 ? "#22c55e" : Number(margin) >= 10 ? "#f97316" : "#ef4444" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
              {(totalIn > 0 || totalOut > 0) && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                  <div style={{ paddingRight: 16, borderRight: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Total Invested</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#64748b" }}>{formatCurrency(totalInvested)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{totalIn} {item.unit} purchased</div>
                  </div>
                  <div style={{ paddingLeft: 16, paddingRight: 16, borderRight: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Revenue from Sales</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#7c5cfc" }}>{formatCurrency(realizedRevenue)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{totalOut} {item.unit} sold</div>
                  </div>
                  <div style={{ paddingLeft: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Realized Profit</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#22c55e" }}>+{formatCurrency(realizedProfit)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>from {totalOut} units sold</div>
                  </div>
                </div>
              )}
            </div>
            )}

          </div>
        </div>
      </Modal>

      <StockHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        item={item}
      />
    </>
  );
};

export default ItemDetailModal;
