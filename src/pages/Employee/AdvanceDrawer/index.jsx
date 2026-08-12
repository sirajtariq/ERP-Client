import { useState, useEffect, useMemo } from "react";
import { Drawer, message } from "antd";
import { CreditCardOutlined } from "@ant-design/icons";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import styles from "./styles.module.css";

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
];

const emptyForm = { date: "", amount: "", reason: "", paymentMethod: "Cash" };

const STATUS_COLOR = { pending: "orange", partial: "blue", recovered: "green" };

const AdvanceDrawer = ({ open, onClose, employee, advances, advanceBalance, onGiveAdvance, onDeleteAdvance }) => {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  const empAdvances = useMemo(
    () => (advances || []).filter((a) => a.employeeId === employee?.id)
         .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [advances, employee]
  );

  const totalGiven = useMemo(() => empAdvances.reduce((s, a) => s + a.amount, 0), [empAdvances]);

  const handleGive = () => {
    if (!form.date) { message.warning("Please select advance date"); return; }
    if (!Number(form.amount) || Number(form.amount) <= 0) { message.warning("Enter a valid amount"); return; }
    if (!form.reason) { message.warning("Please enter reason for advance"); return; }

    const record = {
      id: Date.now(),
      employeeId: employee.id,
      date: form.date,
      amount: Number(form.amount),
      reason: form.reason,
      paymentMethod: form.paymentMethod,
      deductedAmount: 0,
      status: "pending",
    };
    onGiveAdvance(record);
    message.success(`Advance of ${formatCurrency(Number(form.amount))} given to ${employee.name}`);
    setForm(emptyForm);
  };

  if (!employee) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={680}
      title={null}
      destroyOnClose
      styles={{
        header: { display: "none" },
        body: { padding: 0 },
      }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <CreditCardOutlined style={{ fontSize: 20, color: "#f97316" }} />
          <div>
            <h2 className={styles.title}>Advance Management</h2>
            <p className={styles.subtitle}>{employee.name} &nbsp;·&nbsp; {employee.empNo}</p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Outstanding Balance", value: formatCurrency(advanceBalance), color: "#ef4444", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.2)" },
            { label: "Total Given",         value: formatCurrency(totalGiven),     color: "#f97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.2)" },
            { label: "Total Recovered",     value: formatCurrency(totalGiven - advanceBalance), color: "#22c55e", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.2)" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color, letterSpacing: "0.4px" }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Give Advance Form */}
        <div className={styles.formBox}>
          <h3 className={styles.sectionTitle}>Give Advance</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <AppInput
              inputType="date"
              label="Date *"
              value={form.date}
              onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <AppInput
              inputType="number"
              label="Amount (Rs) *"
              placeholder="0"
              min={0}
              value={form.amount}
              onChange={(v) => setForm(f => ({ ...f, amount: v }))}
            />
          </div>
          <AppSelect
            label="Payment Method"
            options={PAYMENT_METHODS}
            value={form.paymentMethod}
            onChange={(v) => setForm(f => ({ ...f, paymentMethod: v }))}
          />
          <AppInput
            label="Reason *"
            placeholder="e.g. Medical Emergency, Personal Need"
            value={form.reason}
            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <AppButton type="primary" icon={<CreditCardOutlined />} onClick={handleGive} className="btn-dark" style={{ minWidth: 140 }}>
              Give Advance
            </AppButton>
          </div>
        </div>

      </div>
    </Drawer>
  );
};

export default AdvanceDrawer;
