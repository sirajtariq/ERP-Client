import { useState, useEffect, useMemo } from "react";
import { Modal, Row, Col, Select, DatePicker, Divider, Radio, message, Spin, Descriptions } from "antd";
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { AppButton, AppInput } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { getEmployeeSalariesTab, createEmployeeSalary } from "@/services/employeeService";
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
  { value: 1, label: "January" }, { value: 2, label: "February" },
  { value: 3, label: "March" }, { value: 4, label: "April" },
  { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" },
  { value: 9, label: "September" }, { value: 10, label: "October" },
  { value: 11, label: "November" }, { value: 12, label: "December" },
];

const PAYMENT_METHODS = [
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
];

const now = new Date();
const THIS_MONTH = now.getMonth() + 1;
const THIS_YEAR = now.getFullYear();

const freshSalaryForm = {
  month: THIS_MONTH, year: THIS_YEAR,
  paymentDate: dayjs(),
  bonus: 0, deductions: 0, advanceDeduction: 0,
  paymentType: "full", partialAmount: "",
  paymentMethod: "Bank Transfer", paidBy: "", remarks: "",
};

const freshAddForm = {
  payType: "remaining",
  amount: "",
  paymentMethod: "Bank Transfer", paidBy: "", remarks: "",
};

const STATUS_CONFIG = {
  paid: { color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.3)", icon: <CheckCircleOutlined />, label: "Paid" },
  partial: { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)", icon: <ExclamationCircleOutlined />, label: "Partial" },
  pending: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", icon: <ClockCircleOutlined />, label: "Pending" },
};

const SalaryModal = ({ open, onClose, onSuccess, employee }) => {
  const [salaryForm, setSalaryForm] = useState(freshSalaryForm);
  const [addForm, setAddForm] = useState(freshAddForm);
  const [apiRecords, setApiRecords] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const advanceBalance = apiSummary?.advanceBalance ?? (employee?.advanceBalance ?? 0);

  const fetchData = async () => {
    if (!employee?.id) return;
    setLoadingData(true);
    try {
      const res = await getEmployeeSalariesTab(employee.id, 1);
      setApiSummary(res.summary || null);

      const latestAdvance = res.summary?.advanceBalance ?? employee?.advanceBalance ?? 0;
      setSalaryForm((f) => ({ ...f, advanceDeduction: latestAdvance }));

      const raw = Array.isArray(res) ? res : (res.results ?? []);
      setApiRecords(raw.map((r) => ({
        id: r.id,
        month: r.month,
        year: r.year,
        netSalary: parseFloat(r.netSalary ?? r.net_salary) || 0,
        bonus: parseFloat(r.bonus) || 0,
        amountPaid: parseFloat(r.amountPaid ?? r.amount_paid) || 0,
        advanceDeduction: parseFloat(r.advanceDeduction) || 0,
        deductions: parseFloat(r.deductions) || 0,
        status: r.status || "pending",
        payments: r.payments || [],
      })));
    } catch {
      setApiRecords([]);
      setApiSummary(null);
    } finally {
      setLoadingData(false);
    }
  };

  // will fix it later Siraj Jugaar
  useEffect(() => {
    if (open) {
      setSalaryForm({
        ...freshSalaryForm,
        advanceDeduction: employee?.advanceBalance || 0,
      });
      setAddForm(freshAddForm);
      fetchData();
    }
  }, [open, employee?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingRecords = useMemo(
    () => [...apiRecords].filter((r) => r.status !== "paid")
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month)),
    [apiRecords]
  );

  const existingRecord = useMemo(
    () => apiRecords.find((r) => r.month === salaryForm.month && r.year === salaryForm.year),
    [apiRecords, salaryForm.month, salaryForm.year]
  );

  const info = getCompanyInfo();
  const salaryBasis = info.salaryBasis || info.salary_calculation_basis || null;
  const weeklyOffDays = info.weeklyOffDays || info.weekly_off_days || [];
  const workingDays = salaryBasis
    ? calcWorkingDays(salaryForm.month, salaryForm.year, salaryBasis, weeklyOffDays)
    : null;
  const perDayRate = workingDays > 0 ? Math.round((employee?.currentSalary || 0) / workingDays) : 0;

  const netDue = Math.max(0,
    (employee?.currentSalary || 0) + (Number(salaryForm.bonus) || 0)
    - (Number(salaryForm.deductions) || 0)
    - (Number(salaryForm.advanceDeduction) || 0)
  );
  const payingNow = salaryForm.paymentType === "full" ? netDue : (Number(salaryForm.partialAmount) || 0);
  const willRemain = Math.max(0, netDue - payingNow);

  const remaining = existingRecord ? (existingRecord.netSalary - (existingRecord.amountPaid || 0)) : 0;
  const addAmount = addForm.payType === "remaining"
    ? remaining
    : Math.min(Number(addForm.amount) || 0, remaining);

  // ── New record: open confirmation ──
  const handleNewRecord = () => {
    if (Number(salaryForm.advanceDeduction) > advanceBalance) {
      message.warning(`Advance deduction exceeds balance of ${formatCurrency(advanceBalance)}`); return;
    }
    setConfirmOpen(true);
  };

  // ── New record: actual API call after confirmation ──
  const handleConfirmedSubmit = async () => {
    setConfirmOpen(false);
    setSubmitLoading(true);
    try {
      await createEmployeeSalary(employee.id, {
        month: salaryForm.month,
        year: salaryForm.year,
        ...(workingDays !== null && { workingDays }),
        bonus: String(Number(salaryForm.bonus) || 0),
        deductions: String(Number(salaryForm.deductions) || 0),
        advanceDeduction: String(Number(salaryForm.advanceDeduction) || 0),
        amount: String(payingNow),
        paymentDate: (salaryForm.paymentDate || dayjs()).format("YYYY-MM-DD"),
        paymentMethod: salaryForm.paymentMethod,
        paidBy: salaryForm.paidBy,
        remarks: salaryForm.remarks,
      });
      const monthName = MONTHS.find((m) => m.value === salaryForm.month)?.label;
      message.success(`${monthName} ${salaryForm.year} salary recorded — ${formatCurrency(payingNow)} paid`);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.detail || "Failed to record salary");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Add payment to existing record ──
  const handleAddPayment = async () => {
    if (!addForm.paidBy.trim()) { message.warning("Please enter who paid"); return; }
    if (addAmount <= 0) { message.warning("Enter a valid amount"); return; }
    setSubmitLoading(true);
    try {
      await createEmployeeSalary(employee.id, {
        month: existingRecord.month,
        year: existingRecord.year,
        amount: String(addAmount),
        paymentDate: (addForm.paymentDate || dayjs()).format("YYYY-MM-DD"),
        paymentMethod: addForm.paymentMethod,
        paidBy: addForm.paidBy,
        remarks: addForm.remarks,
      });
      message.success(`Payment of ${formatCurrency(addAmount)} added`);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.detail || "Failed to add payment");
    } finally {
      setSubmitLoading(false);
    }
  };

  const newRecordValid = salaryForm.paidBy.trim() &&
    (salaryForm.paymentType === "full" || Number(salaryForm.partialAmount) > 0);

  const addPaymentValid = addForm.paidBy.trim() &&
    (addForm.payType === "remaining" || Number(addForm.amount) > 0);

  if (!employee) return null;

  const statCard = (label, value, color, bg, border) => (
    <div style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1.2 }}>
        {loadingData ? "—" : value}
      </span>
    </div>
  );

  const pendingSalary = apiSummary?.pendingSalary ?? 0;
  const partialPending = apiSummary?.partialPendingCount ?? pendingRecords.length;
  const totalRecords = apiRecords.length;

  const totalEarned = apiSummary?.totalEarned ?? 0;
  const baseSalaryVal = apiSummary?.baseSalary ?? 0;
  const netSettlement = apiSummary?.netSettlementAmount ?? 0;
  const daysWorked = apiSummary?.currentMonthDaysWorked ?? 0;
  const accruedThisMonth = apiSummary?.currentMonthAccrued ?? 0;

  // ── Pay Tab rendering ──
  const renderPayTab = () => {
    const monthYearPicker = (
      <div style={{ marginBottom: 16 }}>
        <label className={styles.fieldLabel}>
          Salary Month <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <DatePicker
          picker="month"
          value={dayjs().year(salaryForm.year).month(salaryForm.month - 1)}
          onChange={(date) => {
            if (date) {
              setSalaryForm((f) => ({
                ...f,
                month: date.month() + 1,
                year: date.year(),
                paymentDate: dayjs(),
              }));
            }
          }}
          format="MMMM YYYY"
          allowClear={false}
          style={{ width: "100%", height: 40 }}
        />
      </div>
    );

    const monthLabel = `${MONTHS.find((m) => m.value === salaryForm.month)?.label} ${salaryForm.year}`;

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

    if (existingRecord?.status === "partial" || existingRecord?.status === "pending") {
      const sc = STATUS_CONFIG[existingRecord.status];
      return (
        <div className={styles.payForm}>
          {monthYearPicker}
          <div className={styles.statusBanner} style={{ background: sc.bg, borderColor: sc.border }}>
            <span style={{ color: sc.color, fontSize: 18 }}>{sc.icon}</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: sc.color }}>{monthLabel} — {sc.label}</strong>
              <div style={{ display: "flex", gap: 20, marginTop: 6, flexWrap: "wrap" }}>
                {[
                  { l: "Net Salary", v: formatCurrency(existingRecord.netSalary), c: "var(--color-text)" },
                  { l: "Paid", v: formatCurrency(existingRecord.amountPaid || 0), c: "#22c55e" },
                  { l: "Remaining", v: formatCurrency(remaining), c: "#ef4444" },
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
            <AppButton type="primary" icon={<DollarOutlined />} onClick={handleAddPayment} loading={submitLoading} disabled={!addPaymentValid} className="btn-dark" style={{ minWidth: 160 }}>
              Add Payment
            </AppButton>
          </div>
        </div>
      );
    }

    // No record for this month
    return (
      <div className={styles.payForm}>
        {monthYearPicker}

        <Row gutter={12}>
          <Col span={8}>
            <label className={styles.fieldLabel}>Basic Salary</label>
            <div className={styles.readonlyField}>{formatCurrency(employee.currentSalary || 0)}</div>
            {workingDays !== null && (
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                {formatCurrency(perDayRate)}/day &nbsp;·&nbsp; {workingDays} days
              </div>
            )}
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

        <div className={styles.netBox}>
          <span className={styles.netLabel}>Net Salary Due</span>
          <span className={styles.netValue}>{formatCurrency(netDue)}</span>
        </div>

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
              <div className={styles.readonlyField} style={{ color: "#ef4444" }}>{formatCurrency(willRemain)}</div>
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
          <AppButton type="primary" icon={<DollarOutlined />} onClick={handleNewRecord} loading={submitLoading} disabled={!newRecordValid} className="btn-dark" style={{ minWidth: 160 }}>
            Record Salary
          </AppButton>
        </div>
      </div>
    );
  };

  const monthName = MONTHS.find((m) => m.value === salaryForm.month)?.label;

  return (
    <>
      <Modal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        centered
        width={420}
        title={null}
        footer={null}
        destroyOnClose
      >
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px",
            background: "rgba(124,92,252,0.1)", border: "2px solid rgba(124,92,252,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>
            <DollarOutlined style={{ color: "#7c5cfc" }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)" }}>
            Confirm Salary Payment
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
            {monthName} {salaryForm.year} ki salary pay kar rahe hain
          </p>
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 10, padding: "14px 18px", marginBottom: 20, textAlign: "left",
          }}>
            {[
              { label: "Employee", value: employee.name },
              { label: "Month", value: `${monthName} ${salaryForm.year}` },
              { label: "Net Salary", value: formatCurrency(netDue) },
              { label: "Paying Now", value: formatCurrency(payingNow), color: "#22c55e" },
              salaryForm.paymentType === "partial" && { label: "Remaining", value: formatCurrency(willRemain), color: "#ef4444" },
              Number(salaryForm.advanceDeduction) > 0 && { label: "Advance Deducted", value: formatCurrency(Number(salaryForm.advanceDeduction)), color: "#f97316" },
              { label: "Payment Method", value: salaryForm.paymentMethod },
              { label: "Paid By", value: salaryForm.paidBy },
            ].filter(Boolean).map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: color || "var(--color-text)" }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <AppButton style={{ flex: 1 }} onClick={() => setConfirmOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="primary" className="btn-dark" style={{ flex: 1 }} loading={submitLoading} onClick={handleConfirmedSubmit}>
              Confirm & Pay
            </AppButton>
          </div>
        </div>
      </Modal>

      <Modal open={open} onCancel={onClose} footer={null} width={1000} centered destroyOnClose className={styles.modal} closable={false}
        styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}>

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

        <div style={{ flex: 1, overflowY: "auto" }}>
          <Spin spinning={loadingData}>
            {/* Stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "18px 24px 0" }}>
              {statCard("Current Salary", formatCurrency(employee.currentSalary || 0), "#7c5cfc", "rgba(124,92,252,0.07)", "rgba(124,92,252,0.2)")}
              {statCard("Advance Outstanding", formatCurrency(advanceBalance), "#f97316", "rgba(249,115,22,0.07)", "rgba(249,115,22,0.2)")}
              {statCard("Pending Salary", formatCurrency(pendingSalary), pendingSalary > 0 ? "#ef4444" : "#22c55e", pendingSalary > 0 ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)", pendingSalary > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)")}
              {statCard("Partial / Pending", partialPending, partialPending > 0 ? "#f97316" : "#22c55e", partialPending > 0 ? "rgba(249,115,22,0.07)" : "rgba(34,197,94,0.07)", partialPending > 0 ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "12px 24px 16px" }}>
              {statCard("Total Earned", formatCurrency(totalEarned), "#22c55e", "rgba(34,197,94,0.07)", "rgba(34,197,94,0.2)")}
              {statCard("Base Salary", formatCurrency(baseSalaryVal), "#0ea5e9", "rgba(14,165,233,0.07)", "rgba(14,165,233,0.2)")}
              {statCard("Net Settlement", formatCurrency(netSettlement), "#f97316", "rgba(249,115,22,0.07)", "rgba(249,115,22,0.2)")}
              {statCard("Days Worked (This Month)", daysWorked, "#64748b", "rgba(100,116,139,0.07)", "rgba(100,116,139,0.2)")}
              {statCard("Accrued (This Month)", formatCurrency(accruedThisMonth), "#7c5cfc", "rgba(124,92,252,0.07)", "rgba(124,92,252,0.2)")}
            </div>

            {/* Pending months */}
            {pendingRecords.length > 0 && (
              <div style={{ padding: "0 24px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
                  ⚠ Unpaid from Previous Months
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {pendingRecords.map((r) => {
                    const rem = r.netSalary - (r.amountPaid || 0);
                    const monthName = MONTHS.find((m) => m.value === r.month)?.label;
                    const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                    const isSelected = salaryForm.month === r.month && salaryForm.year === r.year;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSalaryForm((f) => ({ ...f, month: r.month, year: r.year, paymentDate: dayjs().year(r.year).month(r.month - 1).date(1) }))}
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
                        <span style={{ fontSize: 13, fontWeight: 800, color: sc.color }}>{formatCurrency(rem)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ padding: "0 24px 24px" }}>
              {renderPayTab()}
            </div>
          </Spin>
        </div>
      </Modal>
    </>
  );
};

export default SalaryModal;
