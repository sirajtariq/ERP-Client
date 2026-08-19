import { useState, useEffect, useMemo } from "react";
import { Modal, Row, Col, Select, DatePicker, Divider, Radio, message } from "antd";
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { AppButton, AppInput } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import dayjs from "dayjs";
import styles from "./styles.module.css";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const calcWorkingDays = (month, year, basis, offDays) => {
  if (basis === "fixed_30") return 30;
  const total = new Date(year, month, 0).getDate();
  if (basis === "month_days") return total;
  let count = 0;
  for (let i = 1; i <= total; i++) {
    if (!offDays.includes(DAY_NAMES[new Date(year, month - 1, i).getDay()])) count++;
  }
  return count;
};

const MONTHS = [
  { value: 1, label: "January" },  { value: 2,  label: "February" },
  { value: 3, label: "March" },    { value: 4,  label: "April" },
  { value: 5, label: "May" },      { value: 6,  label: "June" },
  { value: 7, label: "July" },     { value: 8,  label: "August" },
  { value: 9, label: "September" },{ value: 10, label: "October" },
  { value: 11, label: "November" },{ value: 12, label: "December" },
];

const PAYMENT_METHODS = [
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash",          label: "Cash" },
  { value: "Cheque",        label: "Cheque" },
];

const now        = new Date();
const THIS_MONTH = now.getMonth() + 1;
const THIS_YEAR  = now.getFullYear();

const freshSalaryForm = {
  month: THIS_MONTH, year: THIS_YEAR,
  paymentDate: dayjs(),
  bonus: 0, deductions: 0, advanceDeduction: 0,
  paymentType: "full", partialAmount: "",
  paymentMethod: "Bank Transfer", paidBy: "", remarks: "",
};

const freshAddForm = {
  payType: "remaining",   // "remaining" | "partial"
  amount: "",
  paymentMethod: "Bank Transfer", paidBy: "", remarks: "",
};

const STATUS_CONFIG = {
  paid:    { color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.3)",   icon: <CheckCircleOutlined />,       label: "Paid" },
  partial: { color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.3)",  icon: <ExclamationCircleOutlined />, label: "Partial" },
  pending: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.3)",   icon: <ClockCircleOutlined />,       label: "Pending" },
};

const SalaryModal = ({
  open, onClose, employee,
  salaryRecords, advanceBalance,
  onPaySalary, onUpdateSalaryRecord,
}) => {
  const [salaryForm,  setSalaryForm]  = useState(freshSalaryForm);
  const [addForm,     setAddForm]     = useState(freshAddForm);

  useEffect(() => {
    if (open) { setSalaryForm(freshSalaryForm); setAddForm(freshAddForm); }
  }, [open]);

  const empRecords = useMemo(
    () => (salaryRecords || [])
      .filter((r) => r.employeeId === employee?.id)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month)),
    [salaryRecords, employee]
  );

  const pendingRecords = useMemo(
    () => empRecords.filter((r) => r.status !== "paid"),
    [empRecords]
  );

  const totalPendingAmount = useMemo(
    () => pendingRecords.reduce((s, r) => s + (r.netSalary - (r.amountPaid || 0)), 0),
    [pendingRecords]
  );

  // Record for the currently selected month/year
  const existingRecord = useMemo(
    () => empRecords.find((r) => r.month === salaryForm.month && r.year === salaryForm.year),
    [empRecords, salaryForm.month, salaryForm.year]
  );

  const { salaryBasis = "month_days", weeklyOffDays = [] } = getCompanyInfo();
  const workingDays = calcWorkingDays(salaryForm.month, salaryForm.year, salaryBasis, weeklyOffDays);
  const perDayRate  = workingDays > 0 ? Math.round((employee?.currentSalary || 0) / workingDays) : 0;

  // Net salary calculation (for new records)
  const netDue = Math.max(0,
    (employee?.currentSalary || 0) + (Number(salaryForm.bonus) || 0)
    - (Number(salaryForm.deductions) || 0)
    - (Number(salaryForm.advanceDeduction) || 0)
  );
  const payingNow  = salaryForm.paymentType === "full" ? netDue : (Number(salaryForm.partialAmount) || 0);
  const willRemain = Math.max(0, netDue - payingNow);

  // For adding to existing partial record
  const remaining = existingRecord ? (existingRecord.netSalary - (existingRecord.amountPaid || 0)) : 0;
  const addAmount = addForm.payType === "remaining"
    ? remaining
    : Math.min(Number(addForm.amount) || 0, remaining);

  // ── Handlers ──
  const handleNewRecord = () => {
    if (!salaryForm.paidBy.trim()) { message.warning("Please enter who paid this salary"); return; }
    if (salaryForm.paymentType === "partial") {
      if (!Number(salaryForm.partialAmount) || Number(salaryForm.partialAmount) <= 0) { message.warning("Enter partial amount to pay"); return; }
      if (Number(salaryForm.partialAmount) > netDue) { message.warning(`Partial amount cannot exceed net salary of ${formatCurrency(netDue)}`); return; }
    }
    if (Number(salaryForm.advanceDeduction) > advanceBalance) {
      message.warning(`Advance deduction exceeds balance of ${formatCurrency(advanceBalance)}`); return;
    }
    const record = {
      id:               Date.now(),
      employeeId:       employee.id,
      month:            salaryForm.month,
      year:             salaryForm.year,
      basicSalary:      employee.currentSalary,
      bonus:            Number(salaryForm.bonus)            || 0,
      deductions:       Number(salaryForm.deductions)       || 0,
      advanceDeduction: Number(salaryForm.advanceDeduction) || 0,
      netSalary:        netDue,
      amountPaid:       payingNow,
      status:           payingNow >= netDue ? "paid" : "partial",
      payments: [{
        id:     Date.now() + 1,
        date:   (salaryForm.paymentDate || dayjs()).format("YYYY-MM-DD"),
        amount: payingNow,
        method: salaryForm.paymentMethod,
        paidBy: salaryForm.paidBy,
        remarks: salaryForm.remarks,
      }],
    };
    onPaySalary(record);
    const monthName = MONTHS.find((m) => m.value === salaryForm.month)?.label;
    message.success(`${monthName} ${salaryForm.year} salary recorded — ${formatCurrency(payingNow)} paid`);
    setSalaryForm(freshSalaryForm);
  };

  const handleAddPayment = () => {
    if (!addForm.paidBy.trim()) { message.warning("Please enter who paid"); return; }
    if (addAmount <= 0) { message.warning("Enter a valid amount"); return; }
    const newPayment = {
      id:      Date.now(),
      date:    new Date().toISOString().slice(0, 10),
      amount:  addAmount,
      method:  addForm.paymentMethod,
      paidBy:  addForm.paidBy,
      remarks: addForm.remarks,
    };
    const newAmountPaid = (existingRecord.amountPaid || 0) + addAmount;
    const updated = {
      ...existingRecord,
      amountPaid: newAmountPaid,
      status:     newAmountPaid >= existingRecord.netSalary ? "paid" : "partial",
      payments:   [...(existingRecord.payments || []), newPayment],
    };
    onUpdateSalaryRecord(updated);
    message.success(`Payment of ${formatCurrency(addAmount)} added`);
    setAddForm(freshAddForm);
  };

  if (!employee) return null;

  // ── Pay Tab rendering ──
  const renderPayTab = () => {
    // Date picker — full calendar so user can see exact payment date; month/year derived from selection
    const monthYearPicker = (
      <div style={{ marginBottom: 16 }}>
        <label className={styles.fieldLabel}>Payment Date <span style={{ color: "#ef4444" }}>*</span></label>
        <DatePicker
          value={salaryForm.paymentDate}
          onChange={(date) => {
            if (date) setSalaryForm((f) => ({ ...f, paymentDate: date, month: date.month() + 1, year: date.year() }));
          }}
          format="DD MMMM YYYY"
          allowClear={false}
          style={{ width: "100%", height: 40 }}
        />
      </div>
    );

    const monthLabel = `${MONTHS.find((m) => m.value === salaryForm.month)?.label} ${salaryForm.year}`;

    // Case 1: Month is fully paid
    if (existingRecord?.status === "paid") {
      return (
        <div className={styles.payForm}>
          {monthYearPicker}
          <div className={styles.statusBanner} style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.3)" }}>
            <CheckCircleOutlined style={{ color: "#22c55e", fontSize: 18 }} />
            <div>
              <strong style={{ color: "#22c55e" }}>{monthLabel} salary is fully paid.</strong>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Total paid: {formatCurrency(existingRecord.amountPaid)} in {existingRecord.payments?.length || 1} installment(s).
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Case 2: Month has a partial record → show "add payment" form
    if (existingRecord?.status === "partial" || existingRecord?.status === "pending") {
      const sc = STATUS_CONFIG[existingRecord.status];
      return (
        <div className={styles.payForm}>
          {monthYearPicker}

          {/* Status summary */}
          <div className={styles.statusBanner} style={{ background: sc.bg, borderColor: sc.border }}>
            <span style={{ color: sc.color, fontSize: 18 }}>{sc.icon}</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: sc.color }}>{monthLabel} — {sc.label}</strong>
              <div style={{ display: "flex", gap: 20, marginTop: 6, flexWrap: "wrap" }}>
                {[
                  { l: "Net Salary", v: formatCurrency(existingRecord.netSalary), c: "var(--color-text)" },
                  { l: "Paid",       v: formatCurrency(existingRecord.amountPaid || 0), c: "#22c55e" },
                  { l: "Remaining",  v: formatCurrency(remaining), c: "#ef4444" },
                ].map(({ l, v, c }) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Divider style={{ margin: "14px 0" }}>Add Payment</Divider>

          {/* Payment type toggle */}
          <div style={{ marginBottom: 14 }}>
            <label className={styles.fieldLabel}>Payment Type</label>
            <Radio.Group value={addForm.payType} onChange={(e) => setAddForm((f) => ({ ...f, payType: e.target.value, amount: "" }))}>
              <Radio value="remaining">Pay Full Remaining ({formatCurrency(remaining)})</Radio>
              <Radio value="partial">Pay Partial Amount</Radio>
            </Radio.Group>
          </div>

          {addForm.payType === "partial" && (
            <AppInput
              inputType="number" label={`Amount (max ${formatCurrency(remaining)})`}
              min={1} max={remaining} placeholder="0"
              value={addForm.amount}
              onChange={(v) => setAddForm((f) => ({ ...f, amount: Math.min(v, remaining) }))}
            />
          )}

          <Row gutter={12}>
            <Col span={8}>
              <label className={styles.fieldLabel}>Payment Method</label>
              <Select value={addForm.paymentMethod} onChange={(v) => setAddForm((f) => ({ ...f, paymentMethod: v }))} options={PAYMENT_METHODS} style={{ width: "100%" }} />
            </Col>
            <Col span={8}>
              <AppInput label="Paid By *" placeholder="e.g. Admin" value={addForm.paidBy} onChange={(e) => setAddForm((f) => ({ ...f, paidBy: e.target.value }))} />
            </Col>
            <Col span={8}>
              <AppInput label="Remarks" placeholder="Optional" value={addForm.remarks} onChange={(e) => setAddForm((f) => ({ ...f, remarks: e.target.value }))} />
            </Col>
          </Row>

          <div className={styles.netBox} style={{ marginTop: 14 }}>
            <span className={styles.netLabel}>Paying Now</span>
            <span className={styles.netValue}>{formatCurrency(addAmount)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <AppButton type="primary" icon={<DollarOutlined />} onClick={handleAddPayment} className="btn-dark" style={{ minWidth: 160 }}>
              Add Payment
            </AppButton>
          </div>
        </div>
      );
    }

    // Case 3: No record for this month → show full new salary form
    return (
      <div className={styles.payForm}>
        {monthYearPicker}

        <Row gutter={12}>
          <Col span={8}>
            <label className={styles.fieldLabel}>Basic Salary</label>
            <div className={styles.readonlyField}>{formatCurrency(employee.currentSalary || 0)}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
              {formatCurrency(perDayRate)}/day &nbsp;·&nbsp; {workingDays} days
            </div>
          </Col>
          <Col span={8}>
            <AppInput inputType="number" label="Bonus (Rs)" min={0} placeholder="0"
              value={salaryForm.bonus} onChange={(v) => setSalaryForm((f) => ({ ...f, bonus: v }))} />
          </Col>
          <Col span={8}>
            <AppInput inputType="number" label="Deductions (Rs)" min={0} placeholder="0"
              value={salaryForm.deductions} onChange={(v) => setSalaryForm((f) => ({ ...f, deductions: v }))} />
          </Col>
        </Row>

        <AppInput
          inputType="number"
          label={`Advance Deduction (Rs) — Outstanding: ${formatCurrency(advanceBalance)}`}
          min={0} max={advanceBalance} placeholder="0"
          value={salaryForm.advanceDeduction}
          onChange={(v) => setSalaryForm((f) => ({ ...f, advanceDeduction: Math.min(v, advanceBalance) }))}
        />

        {/* Net due display */}
        <div className={styles.netBox}>
          <span className={styles.netLabel}>Net Salary Due</span>
          <span className={styles.netValue}>{formatCurrency(netDue)}</span>
        </div>

        {/* Payment type */}
        <div style={{ margin: "16px 0 10px" }}>
          <label className={styles.fieldLabel}>Pay Now</label>
          <Radio.Group value={salaryForm.paymentType} onChange={(e) => setSalaryForm((f) => ({ ...f, paymentType: e.target.value, partialAmount: "" }))}>
            <Radio value="full">Full Salary ({formatCurrency(netDue)})</Radio>
            <Radio value="partial">Partial Amount</Radio>
          </Radio.Group>
        </div>

        {salaryForm.paymentType === "partial" && (
          <Row gutter={12}>
            <Col span={12}>
              <AppInput
                inputType="number" label="Paying Now (Rs)" min={1} max={netDue} placeholder="0"
                value={salaryForm.partialAmount}
                onChange={(v) => setSalaryForm((f) => ({ ...f, partialAmount: Math.min(v, netDue) }))}
              />
            </Col>
            <Col span={12}>
              <label className={styles.fieldLabel}>Will Remain</label>
              <div className={styles.readonlyField} style={{ color: "#ef4444" }}>
                {formatCurrency(willRemain)}
              </div>
            </Col>
          </Row>
        )}

        <Row gutter={12} style={{ marginTop: 12 }}>
          <Col span={8}>
            <label className={styles.fieldLabel}>Payment Method</label>
            <Select value={salaryForm.paymentMethod} onChange={(v) => setSalaryForm((f) => ({ ...f, paymentMethod: v }))} options={PAYMENT_METHODS} style={{ width: "100%" }} />
          </Col>
          <Col span={8}>
            <AppInput label="Paid By *" placeholder="e.g. Admin" value={salaryForm.paidBy} onChange={(e) => setSalaryForm((f) => ({ ...f, paidBy: e.target.value }))} />
          </Col>
          <Col span={8}>
            <AppInput label="Remarks" placeholder="Optional" value={salaryForm.remarks} onChange={(e) => setSalaryForm((f) => ({ ...f, remarks: e.target.value }))} />
          </Col>
        </Row>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <AppButton type="primary" icon={<DollarOutlined />} onClick={handleNewRecord} className="btn-dark" style={{ minWidth: 160 }}>
            Record Salary
          </AppButton>
        </div>
      </div>
    );
  };

  const statCard = (label, value, color, bg, border) => (
    <div style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
    </div>
  );

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={1000} centered destroyOnClose className={styles.modal} closable={false}
      styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}>

      {/* Sticky header — stays visible while content scrolls */}
      <div className={styles.header}>
        <div className={styles.empCard}>
          <div className={styles.avatar}>{employee.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div>
            <h2 className={styles.empName}>{employee.name}</h2>
            <p className={styles.empSub}>{employee.designation} &nbsp;·&nbsp; {employee.department} &nbsp;·&nbsp; {employee.empNo}</p>
            <p className={styles.empSub}>Joined: {employee.joiningDate ? formatDate(employee.joiningDate) : "—"}</p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Scrollable body — header stays fixed above */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 12, padding: "18px 24px 16px" }}>
          {statCard("Current Salary",      formatCurrency(employee.currentSalary || 0), "#7c5cfc", "rgba(124,92,252,0.07)", "rgba(124,92,252,0.2)")}
          {statCard("Advance Outstanding", formatCurrency(advanceBalance),               "#f97316", "rgba(249,115,22,0.07)", "rgba(249,115,22,0.2)")}
          {statCard("Pending Salary",      formatCurrency(totalPendingAmount),           totalPendingAmount > 0 ? "#ef4444" : "#22c55e", totalPendingAmount > 0 ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)", totalPendingAmount > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)")}
          {statCard("Total Records",       empRecords.length,                            "#3b82f6", "rgba(59,130,246,0.07)", "rgba(59,130,246,0.2)")}
        </div>

        {/* Pending / partial months — click to jump to that month */}
        {pendingRecords.length > 0 && (
          <div style={{ padding: "0 24px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
              ⚠ Unpaid from Previous Months
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pendingRecords.map((r) => {
                const remaining = r.netSalary - (r.amountPaid || 0);
                const monthName = MONTHS.find((m) => m.value === r.month)?.label;
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                const isSelected = salaryForm.month === r.month && salaryForm.year === r.year;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSalaryForm((f) => ({
                      ...f,
                      month: r.month,
                      year: r.year,
                      paymentDate: dayjs().year(r.year).month(r.month - 1).date(1),
                    }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${isSelected ? sc.color : sc.border}`,
                      background: isSelected ? sc.bg : "var(--color-surface)",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{monthName} {r.year}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Remaining:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: sc.color }}>{formatCurrency(remaining)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ padding: "0 24px 24px" }}>
          {renderPayTab()}
        </div>
      </div>
    </Modal>
  );
};

export default SalaryModal;
