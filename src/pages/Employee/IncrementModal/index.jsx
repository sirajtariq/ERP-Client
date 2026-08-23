import { useState, useEffect } from "react";
import { Modal, Row, Col, message, DatePicker } from "antd";
import { RiseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppButton, AppInput } from "@/components/common";
import { formatCurrency } from "@/utils";
import { getEmployeeIncrementsTab, createEmployeeIncrement } from "@/services/employeeService";
import styles from "./styles.module.css";

const emptyForm = { effectiveDate: null, incrementAmount: "", reason: "", approvedBy: "" };

const IncrementModal = ({ open, onClose, onSuccess, employee }) => {
  const [form,           setForm]           = useState(emptyForm);
  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [submitLoading,  setSubmitLoading]  = useState(false);

  const isValid = form.effectiveDate && Number(form.incrementAmount) > 0 && form.reason.trim();
  const newSalary = (summary?.currentSalary ?? employee?.currentSalary ?? 0) + (Number(form.incrementAmount) || 0);

  const fetchSummary = async () => {
    if (!employee?.id) return;
    setSummaryLoading(true);
    try {
      const res = await getEmployeeIncrementsTab(employee.id, 1);
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

  const handleAdd = async () => {
    if (!isValid) return;
    setSubmitLoading(true);
    try {
      await createEmployeeIncrement(employee.id, {
        effectiveDate:   dayjs(form.effectiveDate).format("YYYY-MM-DD"),
        incrementAmount: String(Number(form.incrementAmount)),
        approvedBy:      form.approvedBy || "",
        reason:          form.reason,
      });
      message.success(`Increment of ${formatCurrency(Number(form.incrementAmount))} added`);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.detail || "Failed to add increment");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!employee) return null;

  const basicSalary     = summary?.basicSalary      ?? employee.basicSalary   ?? 0;
  const currentSalary   = summary?.currentSalary    ?? employee.currentSalary ?? 0;
  const totalIncremented = summary?.totalIncremented ?? 0;
  const noOfIncrements  = summary?.noOfIncrements   ?? 0;

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={860} centered destroyOnClose closable={false} className={styles.modal}
      styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}>

      <div className={styles.header}>
        <div>
          <h2 className={styles.title}><RiseOutlined style={{ marginRight: 8, color: "#3b82f6" }} />Salary Increment</h2>
          <p className={styles.subtitle}>{employee.name} &nbsp;·&nbsp; {employee.empNo} &nbsp;·&nbsp; {employee.designation}</p>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* Cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Basic Salary",      value: formatCurrency(basicSalary),      color: "#64748b", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.2)" },
            { label: "Current Salary",    value: formatCurrency(currentSalary),    color: "#7c5cfc", bg: "rgba(124,92,252,0.07)",  border: "rgba(124,92,252,0.2)" },
            { label: "Total Incremented", value: formatCurrency(totalIncremented), color: "#22c55e", bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.2)" },
            { label: "No. of Increments", value: noOfIncrements,                  color: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.2)" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: summaryLoading ? "var(--color-bg-secondary)" : bg, border: `1px solid ${border}`, transition: "all 0.2s" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color, letterSpacing: "0.5px" }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 4 }}>{summaryLoading ? "—" : value}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className={styles.formBox}>
          <h3 className={styles.sectionTitle}>Add New Increment</h3>
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
                  Effective Date <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <DatePicker
                  value={form.effectiveDate ? dayjs(form.effectiveDate) : null}
                  onChange={(date) => setForm(f => ({ ...f, effectiveDate: date ? date.format("YYYY-MM-DD") : null }))}
                  format="DD MMMM YYYY"
                  allowClear={false}
                  style={{ width: "100%", height: 40 }}
                  placeholder="Select date"
                />
              </div>
            </Col>
            <Col span={6}>
              <AppInput
                inputType="number"
                label="Increment Amount (Rs) *"
                placeholder="0"
                min={0}
                value={form.incrementAmount}
                onChange={(v) => setForm(f => ({ ...f, incrementAmount: v }))}
              />
            </Col>
            <Col span={6}>
              <label className={styles.fieldLabel}>New Salary (Preview)</label>
              <div className={styles.previewSalary}>{formatCurrency(newSalary)}</div>
            </Col>
            <Col span={6}>
              <AppInput
                label="Approved By"
                placeholder="e.g. Director"
                value={form.approvedBy}
                onChange={(e) => setForm(f => ({ ...f, approvedBy: e.target.value }))}
              />
            </Col>
          </Row>
          <AppInput
            label="Reason *"
            placeholder="e.g. Annual Performance Review, Promotion"
            value={form.reason}
            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <AppButton
              type="primary"
              icon={<RiseOutlined />}
              onClick={handleAdd}
              className="btn-dark"
              style={{ minWidth: 150 }}
              disabled={!isValid}
              loading={submitLoading}
            >
              Add Increment
            </AppButton>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default IncrementModal;
