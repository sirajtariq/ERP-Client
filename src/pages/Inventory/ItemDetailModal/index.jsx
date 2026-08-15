import { useMemo } from "react";
import { Modal, Table, Tag } from "antd";
import {
  BoxPlotOutlined, PlusCircleOutlined, MinusCircleOutlined,
  DollarOutlined, RiseOutlined, BarChartOutlined,
} from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import styles from "./styles.module.css";

const StatCard = ({ label, value, color, bg, border }) => (
  <div style={{ flex: 1, padding: "12px 14px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value || "—"}</span>
  </div>
);

const stockStatus = (item) => {
  if (item.currentStock === 0)               return { label: "Out of Stock", color: "error",   text: "#ef4444" };
  if (item.currentStock <= item.minStock)    return { label: "Low Stock",    color: "warning",  text: "#f97316" };
  return                                            { label: "In Stock",     color: "success",  text: "#22c55e" };
};

const ItemDetailModal = ({ open, onClose, item, stockHistory = [], onStockIn, onStockOut }) => {
  const itemHistory = useMemo(
    () => (stockHistory || [])
      .filter((h) => h.itemId === item?.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [stockHistory, item?.id]
  );

  const totalIn  = useMemo(() => itemHistory.filter((h) => h.type === "in").reduce((s, h)  => s + h.qty, 0), [itemHistory]);
  const totalOut = useMemo(() => itemHistory.filter((h) => h.type === "out").reduce((s, h) => s + h.qty, 0), [itemHistory]);

  if (!item) return null;

  const margin           = item.purchaseRate > 0 ? ((item.saleRate - item.purchaseRate) / item.purchaseRate * 100).toFixed(1) : 0;
  const profitPerUnit    = item.saleRate - item.purchaseRate;
  const purchaseValue    = item.currentStock * item.purchaseRate;
  const saleValue        = item.currentStock * item.saleRate;
  const potentialProfit  = saleValue - purchaseValue;
  const totalInvested    = totalIn  * item.purchaseRate;
  const realizedRevenue  = totalOut * item.saleRate;
  const realizedProfit   = totalOut * profitPerUnit;
  const st               = stockStatus(item);

  const histColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: "13%",
      render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: "10%",
      render: (v) => v === "in"
        ? <Tag color="success" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}><PlusCircleOutlined /> In</Tag>
        : <Tag color="warning" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}><MinusCircleOutlined /> Out</Tag>,
    },
    {
      title: "Qty",
      dataIndex: "qty",
      key: "qty",
      width: "9%",
      render: (v, r) => (
        <span style={{ fontWeight: 800, color: r.type === "in" ? "#22c55e" : "#f97316" }}>
          {r.type === "in" ? "+" : "−"}{v}
        </span>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      width: "18%",
      render: (v) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (v) => <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{v || "—"}</span>,
    },
    {
      title: "Stock Before",
      dataIndex: "stockBefore",
      key: "sb",
      width: "11%",
      render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v}</span>,
    },
    {
      title: "Stock After",
      dataIndex: "stockAfter",
      key: "sa",
      width: "11%",
      render: (v) => <span style={{ fontWeight: 700, fontSize: 13 }}>{v}</span>,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      centered
      destroyOnClose
      closable={false}
      className={styles.modal}
      styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
    >
      {/* Sticky header */}
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
            <Tag color={st.color} style={{ borderRadius: 6, fontWeight: 600, marginTop: 4, fontSize: 11 }}>
              {st.label}
            </Tag>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Summary stat cards */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px 4px" }}>
          <StatCard label="Current Stock"    value={`${item.currentStock} ${item.unit}`} color={st.text}  bg={`${st.text}12`}              border={`${st.text}30`} />
          <StatCard label="Purchase Value"   value={formatCurrency(purchaseValue)}        color="#64748b"  bg="rgba(100,116,139,0.07)"       border="rgba(100,116,139,0.2)" />
          <StatCard label="Sale Value"       value={formatCurrency(saleValue)}            color="#7c5cfc"  bg="rgba(124,92,252,0.07)"        border="rgba(124,92,252,0.2)" />
          <StatCard label="Potential Profit" value={formatCurrency(potentialProfit)}      color="#22c55e"  bg="rgba(34,197,94,0.07)"         border="rgba(34,197,94,0.2)" />
          <StatCard label="Profit Margin"    value={`${margin}%`}                        color={Number(margin) >= 20 ? "#22c55e" : Number(margin) >= 10 ? "#f97316" : "#ef4444"} bg="rgba(34,197,94,0.07)" border="rgba(34,197,94,0.2)" />
        </div>

        <div style={{ padding: "12px 24px 24px" }}>

          {/* Item details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div className={styles.infoBox}>
              <div className={styles.boxTitle}><BarChartOutlined style={{ marginRight: 6 }} />Item Info</div>
              <InfoRow label="Item Code"   value={item.itemCode} />
              <InfoRow label="Category"    value={item.category} />
              <InfoRow label="Unit"        value={item.unit} />
              <InfoRow label="Min Stock"   value={`${item.minStock} ${item.unit}`} />
              {item.description && <InfoRow label="Description" value={item.description} />}
            </div>
            <div className={styles.infoBox}>
              <div className={styles.boxTitle}><DollarOutlined style={{ marginRight: 6 }} />Stock Summary</div>
              <InfoRow label="Opening Stock" value={`${(itemHistory[itemHistory.length - 1]?.stockBefore ?? 0)} ${item.unit}`} />
              <InfoRow label="Total In"      value={<span style={{ color: "#22c55e", fontWeight: 700 }}>{totalIn} {item.unit}</span>} />
              <InfoRow label="Total Out"     value={<span style={{ color: "#f97316", fontWeight: 700 }}>{totalOut} {item.unit}</span>} />
              <InfoRow label="Current Stock" value={<span style={{ color: st.text, fontWeight: 800 }}>{item.currentStock} {item.unit}</span>} />
              <InfoRow label="Profit / Item" value={<span style={{ color: "#22c55e", fontWeight: 700 }}>+{formatCurrency(item.saleRate - item.purchaseRate)}</span>} />
            </div>
          </div>

          {/* Stock Value Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>
              <DollarOutlined style={{ marginRight: 6, color: "#7c5cfc" }} />
              Stock Value Analysis
            </div>

            {/* 3 main value cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(100,116,139,0.07)", border: "1px solid rgba(100,116,139,0.2)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "#64748b", marginBottom: 6 }}>Purchase Value</div>
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

            {/* Per-unit rate breakdown row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[
                { label: "Purchase Rate / Unit", value: formatCurrency(item.purchaseRate), color: "#64748b" },
                { label: "Sale Rate / Unit",      value: formatCurrency(item.saleRate),     color: "#7c5cfc" },
                { label: "Profit / Unit",         value: `+${formatCurrency(profitPerUnit)}`, color: "#22c55e" },
                { label: "Profit Margin",         value: `${margin}%`,                      color: Number(margin) >= 20 ? "#22c55e" : Number(margin) >= 10 ? "#f97316" : "#ef4444" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Historical realized section */}
            {itemHistory.length > 0 && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                <div style={{ paddingRight: 16, borderRight: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Total Invested (all purchases)</div>
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

          {/* Stock history table */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                <RiseOutlined style={{ marginRight: 6, color: "#7c5cfc" }} />
                Stock History
              </span>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Total In: +{totalIn}</span>
                <span style={{ fontSize: 12, color: "#f97316", fontWeight: 600 }}>Total Out: −{totalOut}</span>
              </div>
            </div>
            <Table
              columns={histColumns}
              dataSource={itemHistory}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: false, size: "small" }}
              locale={{ emptyText: "No stock movements recorded yet" }}
              style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
              rowClassName={(r) => r.type === "in" ? styles.rowIn : styles.rowOut}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ItemDetailModal;
