import { useState, useEffect } from "react";
import { Drawer, message, DatePicker } from "antd";
import { CreditCardOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { formatCurrency } from "@/utils";
import { getEmployeeAdvancesTab, createEmployeeAdvance } from "@/services/employeeService";
import styles from "./styles.module.css";

const PAYMENT_METHODS = [
  { value: "Cash",          label: "Cash" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque",        label: "Cheque" },
];

const emptyForm = { date: null, amount: "", reason: "", paymentMethod: "Cash" };

const AdvanceDrawer = ({ open, onClose, onSuccess, employee }) => {
  const [form,           setForm]           = useState(emptyForm);
  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [submitLoading,  setSubmitLoading]  = useState(false);

  const isValid = form.date && Number(form.amount) > 0 && form.reason.trim();

  const fetchSummary = async () => {
    if (!employee?.id) return;
    setSummaryLoading(true);
    try {
      const res = await getEmployeeAdvancesTab(employee.id, 1);
      setSummary(res.summary || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      fetchSummary();
    }
  }, [open, employee?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGive = async () => {
    if (!isValid) return;
    setSubmitLoading(true);
    try {
      await createEmployeeAdvance(employee.id, {
        date:          dayjs(form.date).format("YYYY-MM-DD"),
        amount:        String(Number(form.amount)),
        paymentMethod: form.paymentMethod,
        reason:        form.reason,
      });
      message.success(`Advance of ${formatCurrency(Number(form.amount))} given to ${employee.name}`);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.detail || "Failed to give advance");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!employee) return null;

  const outstanding = summary?.outstandingBalance ?? 0;
  const totalGiven  = summary?.totalGiven         ?? 0;
  const recovered   = summary?.totalRecovered     ?? 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={680}
      title={null}
      destroyOnClose
      styles={{ header: { display: "none" }, body: { padding: 0 } }}
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
        {/* Summary cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Outstanding Balance", value: formatCurrency(outstanding), color: "#ef4444", bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.2)" },
            { label: "Total Given",         value: formatCurrency(totalGiven),  color: "#f97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.2)" },
            { label: "Total Recovered",     value: formatCurrency(recovered),   color: "#22c55e", bg: "rgba(34,197,94,0.07)",  border: "rgba(34,197,94,0.2)" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, background: summaryLoading ? "var(--color-bg-secondary)" : bg, border: `1px solid ${border}`, transition: "all 0.2s" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color, letterSpacing: "0.4px" }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 4 }}>
                {summaryLoading ? "—" : value}
              </div>
            </div>
          ))}
        </div>

        {/* Give Advance form */}
        <div className={styles.formBox}>
          <h3 className={styles.sectionTitle}>Give Advance</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
                Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <DatePicker
                value={form.date ? dayjs(form.date) : null}
                onChange={(date) => setForm(f => ({ ...f, date: date ? date.format("YYYY-MM-DD") : null }))}
                format="DD MMMM YYYY"
                allowClear={false}
                style={{ width: "100%", height: 40 }}
                placeholder="Select date"
              />
            </div>
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
            <AppButton
              type="primary"
              icon={<CreditCardOutlined />}
              onClick={handleGive}
              className="btn-dark"
              style={{ minWidth: 140 }}
              disabled={!isValid}
              loading={submitLoading}
            >
              Give Advance
            </AppButton>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default AdvanceDrawer;
