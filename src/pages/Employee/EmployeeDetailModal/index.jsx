import { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import { Modal, Tabs, Table, Tag, Divider, Spin, message } from "antd";
import {
  UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  IdcardOutlined, CalendarOutlined, RiseOutlined, DollarOutlined,
  CreditCardOutlined, LeftOutlined, RightOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { getEmployeeAdvancesTab, getEmployeeIncrementsTab, getEmployeeSalariesTab, getEmployeeAttendance, createAttendance, updateAttendance, getSalaryPayslip } from "@/services/employeeService";
import { formatCurrency, formatDate } from "@/utils";
import SalarySlipModal from "../SalarySlipModal";
import styles from "./styles.module.css";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];


const ADV_COLOR = { pending: "orange", partial: "blue", recovered: "green" };

const EDIT_MAIN = [
  { v: "present", label: "P", title: "Present",  color: "#22c55e" },
  { v: "absent",  label: "A", title: "Absent",   color: "#ef4444" },
  { v: "half",    label: "½", title: "Half Day", color: "#f97316" },
  { v: "leave",   label: "L", title: "Leave",    color: "#3b82f6" },
];
const getAttMain   = (s) => !s || s === "present" || s === "absent" ? (s || "present") : s.startsWith("half") ? "half" : "leave";
const getAttPaid   = (s) => !s?.endsWith("unpaid");
const buildAttSt   = (main, paid) => (main === "present" || main === "absent") ? main : `${main}_${paid ? "paid" : "unpaid"}`;

const InfoRow = ({ icon, label, value }) => (
  <div className={styles.row}>
    <span className={styles.rowIcon}>{icon}</span>
    <span className={styles.rowLabel}>{label}</span>
    <span className={styles.rowValue}>{value || "—"}</span>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className={styles.statCard} style={{ borderColor: color + "33", background: color + "0d" }}>
    <span className={styles.statLabel} style={{ color }}>{label}</span>
    <span className={styles.statValue} style={{ color }}>{value}</span>
  </div>
);

const MiniCard = ({ label, value, color, bg, border }) => (
  <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
  </div>
);

const EmployeeDetailModal = ({
  open, onClose, employee,
  advanceBalance, empSalaryRecords = [], empIncrements = [], empAdvances = [], empAttendance = [],
  onDeleteSalaryRecord, onDeleteIncrement, onDeleteAdvance, onEditAttendance,
}) => {
  const totalGiven         = useMemo(() => empAdvances.reduce((s, a) => s + a.amount, 0), [empAdvances]);
  const totalPaidYTD       = useMemo(() => empSalaryRecords.reduce((s, r) => s + (r.amountPaid || 0), 0), [empSalaryRecords]);
  const totalBonusYTD      = useMemo(() => empSalaryRecords.reduce((s, r) => s + (r.bonus || 0), 0), [empSalaryRecords]);
  const totalPendingSalary = useMemo(
    () => empSalaryRecords.filter(r => r.status !== "paid").reduce((s, r) => s + (r.netSalary - (r.amountPaid || 0)), 0),
    [empSalaryRecords]
  );

  // Full month-by-month timeline from joining date → current month
  const monthTimeline = useMemo(() => {
    if (!employee?.joiningDate) return [];
    const start = dayjs(employee.joiningDate).startOf("month");
    const end   = dayjs().startOf("month");
    const rows  = [];
    let cur = end;
    while (cur.valueOf() >= start.valueOf()) {
      const m = cur.month() + 1;
      const y = cur.year();
      const record = empSalaryRecords.find((r) => r.month === m && r.year === y) || null;
      rows.push({ key: record?.id ?? `${y}-${m}`, month: m, year: y, record });
      cur = cur.subtract(1, "month");
    }
    return rows;
  }, [employee?.joiningDate, empSalaryRecords]);

  // Only count months with an actual record that isn't fully paid (not "no record" months)
  const unpaidMonthCount = useMemo(
    () => monthTimeline.filter((row) => row.record && row.record.status !== "paid").length,
    [monthTimeline]
  );

  const [attMonth, setAttMonth] = useState(() => dayjs().startOf("month"));
  const [editDay,  setEditDay]  = useState(null);

  const [activeTab,          setActiveTab]          = useState("personal");

  const [advancesData,       setAdvancesData]       = useState([]);
  const [advancesSummary,    setAdvancesSummary]    = useState(null);
  const [advancesLoading,    setAdvancesLoading]    = useState(false);
  const [advancesPage,       setAdvancesPage]       = useState(1);
  const [advancesTotal,      setAdvancesTotal]      = useState(0);

  const [incrementsData,     setIncrementsData]     = useState([]);
  const [incrementsSummary,  setIncrementsSummary]  = useState(null);
  const [incrementsLoading,  setIncrementsLoading]  = useState(false);
  const [incrementsPage,     setIncrementsPage]     = useState(1);
  const [incrementsTotal,    setIncrementsTotal]    = useState(0);

  const [salaryData,         setSalaryData]         = useState([]);
  const [salarySummary,      setSalarySummary]      = useState(null);
  const [salaryLoading,      setSalaryLoading]      = useState(false);
  const [salaryPage,         setSalaryPage]         = useState(1);
  const [salaryTotal,        setSalaryTotal]        = useState(0);

  const [attData,            setAttData]            = useState(null);
  const [attLoading,         setAttLoading]         = useState(false);
  const [saveDayLoading,     setSaveDayLoading]     = useState(false);
  const [slipLoading,        setSlipLoading]        = useState(false);
  const [slipData,           setSlipData]           = useState(null);
  const [slipOpen,           setSlipOpen]           = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab("personal");
    setAdvancesData([]);    setAdvancesSummary(null);   setAdvancesPage(1);   setAdvancesTotal(0);
    setIncrementsData([]);  setIncrementsSummary(null); setIncrementsPage(1); setIncrementsTotal(0);
    setSalaryData([]);      setSalarySummary(null);     setSalaryPage(1);     setSalaryTotal(0);
    setAttData(null);       setAttLoading(false);
    setAttMonth(dayjs().startOf("month")); setEditDay(null);
  }, [open, employee?.id]);

  const fetchAdvances = async (page = 1) => {
    if (!employee?.id) return;
    setAdvancesLoading(true);
    try {
      const res = await getEmployeeAdvancesTab(employee.id, page);
      setAdvancesSummary(res.summary || null);
      setAdvancesTotal(res.count || 0);
      setAdvancesPage(page);
      const raw = Array.isArray(res) ? res : (res.results ?? []);
      setAdvancesData(raw.map((a) => ({
        id:             a.id,
        date:           a.date                                       || "",
        amount:         parseFloat(a.amount)                         || 0,
        deductedAmount: parseFloat(a.deductedAmount ?? a.recovered)  || 0,
        status:         a.status                                     || "pending",
        paymentMethod:  a.paymentMethod || a.method                  || "",
        reason:         a.reason                                     || "",
      })));
    } catch {
      setAdvancesData([]);
      setAdvancesSummary(null);
    } finally {
      setAdvancesLoading(false);
    }
  };

  const fetchIncrements = async (page = 1) => {
    if (!employee?.id) return;
    setIncrementsLoading(true);
    try {
      const res = await getEmployeeIncrementsTab(employee.id, page);
      setIncrementsSummary(res.summary || null);
      setIncrementsTotal(res.count || 0);
      setIncrementsPage(page);
      const raw = Array.isArray(res) ? res : (res.results ?? []);
      setIncrementsData(raw.map((r) => ({
        id:              r.id,
        effectiveDate:   r.effectiveDate   || r.date    || "",
        previousSalary:  parseFloat(r.previousSalary)   || 0,
        incrementAmount: parseFloat(r.incrementAmount)  || 0,
        newSalary:       parseFloat(r.newSalary)        || 0,
        reason:          r.reason                       || "",
        approvedBy:      r.approvedBy                   || "",
      })));
    } catch {
      setIncrementsData([]);
      setIncrementsSummary(null);
    } finally {
      setIncrementsLoading(false);
    }
  };

  const fetchSalaries = async (page = 1) => {
    if (!employee?.id) return;
    setSalaryLoading(true);
    try {
      const res = await getEmployeeSalariesTab(employee.id, page);
      setSalarySummary(res.summary || null);
      setSalaryTotal(res.count   || 0);
      setSalaryPage(page);
      const raw = Array.isArray(res) ? res : (res.results ?? []);
      setSalaryData(raw.map((r) => ({
        id:               r.id,
        month:            r.month,
        year:             r.year,
        netSalary:        parseFloat(r.netSalary        ?? r.net_salary)    || 0,
        bonus:            parseFloat(r.bonus)                               || 0,
        amountPaid:       parseFloat(r.amountPaid       ?? r.amount_paid)   || 0,
        deductions:       parseFloat(r.deductions)                          || 0,
        advanceDeduction: parseFloat(r.advanceDeduction ?? r.advance_deduction) || 0,
        status:           r.status                                          || "pending",
        payments:         r.payments                                        || [],
      })));
    } catch {
      setSalaryData([]);
      setSalarySummary(null);
    } finally {
      setSalaryLoading(false);
    }
  };

  const fetchAttendance = async (month = attMonth) => {
    if (!employee?.id) return;
    setAttLoading(true);
    try {
      const res = await getEmployeeAttendance(employee.id, month.month() + 1, month.year());
      setAttData(res);
    } catch {
      setAttData(null);
    } finally {
      setAttLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "advances")   fetchAdvances(1);
    if (key === "increments") fetchIncrements(1);
    if (key === "salary")     fetchSalaries(1);
    if (key === "attendance") fetchAttendance(attMonth);
  };

  useEffect(() => {
    if (activeTab === "attendance" && open && employee?.id) fetchAttendance(attMonth);
  }, [attMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const attSummary = attData?.summary ?? { present: 0, absent: 0, halfDay: 0, leave: 0, offDays: 0, notMarked: 0 };

  const printSalarySlip = async (row) => {
    setSlipLoading(true);
    try {
      const payslip = await getSalaryPayslip(employee.id, row.record.id);
      setSlipData(payslip);
      setSlipOpen(true);
    } catch (err) {
      message.error("Failed to load payslip data");
      console.error(err);
    } finally {
      setSlipLoading(false);
    }
  };

  if (!employee) return null;

  const tabBadges  = employee.tabBadges || {};
  const incCount   = tabBadges.incrementsCount  ?? empIncrements.length;
  const advCount   = tabBadges.advancesCount    ?? empAdvances.length;
  const attAlert   = tabBadges.attendanceAlertBadge || "";
  const unpaidCount = tabBadges.unpaidSalariesCount || 0;

  const topMetrics = employee.topMetrics || {
    currentSalary:      employee.currentSalary || 0,
    pendingSalary:       totalPendingSalary,
    advanceBalance:      advanceBalance,
    salaryRecordsCount:  empSalaryRecords.length,
    noOfIncrements:      empIncrements.length,
  };

  const salaryInfo = employee.salaryInfo || {
    basicSalary:            employee.basicSalary   || 0,
    currentSalary:          employee.currentSalary || 0,
    totalIncremented:       (employee.currentSalary || 0) - (employee.basicSalary || 0),
    noOfIncrements:         empIncrements.length,
    totalEarned:            0,
    totalPaid:              0,
    pendingBalance:         0,
    baseSalary:             employee.currentSalary || 0,
    currentMonthDaysWorked: 0,
    currentMonthAccrued:    0,
    netSettlementAmount:    0,
  };

  // ── Attendance calendar cells (built from API calendarGrid) ──
  const attOffset = attMonth.startOf("month").day() === 0 ? 6 : attMonth.startOf("month").day() - 1;
  const calGrid   = attData?.calendarGrid ?? [];
  const attCells  = [];
  for (let i = 0; i < attOffset; i++) attCells.push({ key: `e${i}`, empty: true });
  calGrid.forEach((c) => attCells.push({ key: c.date, d: c.day, isOff: c.isWeeklyOff, status: c.status, badge: c.badge, date: c.date }));

  const ATT_C = {
    present:      { bg: "rgba(34,197,94,0.15)",  border: "#22c55e", color: "#16a34a" },
    absent:       { bg: "rgba(239,68,68,0.15)",  border: "#ef4444", color: "#dc2626" },
    half_paid:    { bg: "rgba(249,115,22,0.12)", border: "#f97316", color: "#ea580c" },
    half_unpaid:  { bg: "rgba(249,115,22,0.22)", border: "#c2410c", color: "#c2410c" },
    leave_paid:   { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", color: "#2563eb" },
    leave_unpaid: { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", color: "#7c3aed" },
    weekly_off:   { bg: "var(--color-bg-secondary)", border: "var(--color-border)",   color: "#94a3b8" },
  };

  const salaryExpandedRow = (record) => {
    const payments = record.payments || [];
    return (
      <div style={{
        margin: "0 0 0 48px",
        padding: "14px 18px",
        background: "linear-gradient(135deg, rgba(124,92,252,0.05), rgba(59,130,246,0.04))",
        border: "1px solid rgba(124,92,252,0.2)",
        borderLeft: "3px solid #7c5cfc",
        borderRadius: "0 10px 10px 0",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#7c5cfc", marginBottom: 10 }}>
          Payment History — {payments.length} installment{payments.length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {payments.map((p, i) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 8,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "rgba(124,92,252,0.12)", border: "1px solid rgba(124,92,252,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: "#7c5cfc", flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: "0 0 100px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Date</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)" }}>{formatDate(p.paymentDate)}</div>
              </div>
              <div style={{ flex: "0 0 110px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Amount</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>{formatCurrency(p.amount)}</div>
              </div>
              <div style={{ flex: "0 0 130px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Method</div>
                <Tag style={{ borderRadius: 5, fontSize: 11, fontWeight: 600, margin: 0 }}>{p.paymentMethod || "—"}</Tag>
              </div>
              <div style={{ flex: "0 0 110px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Paid By</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>{p.paidBy || "—"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Remarks</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontStyle: p.remarks ? "normal" : "italic" }}>{p.remarks || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Increment columns ──
  const incColumns = [
    { title: "Effective Date",  dataIndex: "effectiveDate",  key: "date", width: "14%", render: (v) => <span style={{ fontWeight: 600 }}>{formatDate(v)}</span> },
    { title: "Previous Salary", dataIndex: "previousSalary", key: "prev", width: "16%", render: (v) => <span style={{ color: "#64748b" }}>{formatCurrency(v)}</span> },
    { title: "Increment",       dataIndex: "incrementAmount",key: "inc",  width: "13%", render: (v) => <span style={{ fontWeight: 700, color: "#22c55e" }}>+{formatCurrency(v)}</span> },
    { title: "New Salary",      dataIndex: "newSalary",      key: "new",  width: "15%", render: (v) => <span style={{ fontWeight: 800, color: "#7c5cfc" }}>{formatCurrency(v)}</span> },
    { title: "Reason",          dataIndex: "reason",         key: "reason", ellipsis: true, render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v}</span> },
    { title: "Approved By",     dataIndex: "approvedBy",     key: "appr", width: "13%", render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v || "—"}</span> },
  ].filter(Boolean);

  // ── Advance columns ──
  const advColumns = [
    { title: "Date",        dataIndex: "date",          key: "date",   width: 100, render: (v) => <span style={{ fontWeight: 600, fontSize: 12 }}>{formatDate(v)}</span> },
    { title: "Amount",      dataIndex: "amount",        key: "amount", width: 110, render: (v) => <span style={{ fontWeight: 700, color: "#f97316" }}>{formatCurrency(v)}</span> },
    { title: "Deducted",    dataIndex: "deductedAmount",key: "ded",    width: 110, render: (v) => <span style={{ color: "#22c55e", fontWeight: 600 }}>{formatCurrency(v || 0)}</span> },
    { title: "Remaining",   key: "remaining",           width: 110,
      render: (_, r) => { const rem = r.amount - (r.deductedAmount || 0); return <span style={{ fontWeight: 700, color: rem > 0 ? "#ef4444" : "#22c55e" }}>{formatCurrency(rem)}</span>; }},
    { title: "Status",      dataIndex: "status",        key: "status", width: 90,
      render: (v) => <Tag color={ADV_COLOR[v] || "default"} style={{ borderRadius: 5, fontWeight: 600, textTransform: "capitalize" }}>{v}</Tag> },
    { title: "Method",      dataIndex: "paymentMethod", key: "method", width: 100, render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v || "—"}</span> },
    { title: "Reason",      dataIndex: "reason",        key: "reason", ellipsis: true, render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v || "—"}</span> },
  ].filter(Boolean);

  const tabItems = [
    {
      key: "personal",
      label: <span style={{ fontWeight: 600 }}><UserOutlined /> Personal</span>,
      children: (
        <div>
          <h3 className={styles.sectionTitle}><UserOutlined style={{ marginRight: 6 }} />Personal Info</h3>
          <div className={styles.infoBox}>
            <InfoRow icon={<IdcardOutlined />}      label="Employee No."  value={employee.empNo} />
            <InfoRow icon={<PhoneOutlined />}       label="Phone"         value={employee.phone} />
            <InfoRow icon={<MailOutlined />}        label="Email"         value={employee.email} />
            <InfoRow icon={<IdcardOutlined />}      label="CNIC"          value={employee.cnic} />
            <InfoRow icon={<EnvironmentOutlined />} label="Address"       value={employee.address} />
            <InfoRow icon={<CalendarOutlined />}    label="Joining Date"  value={employee.joiningDate ? formatDate(employee.joiningDate) : "—"} />
            {employee.leavingDate   && <InfoRow icon={<CalendarOutlined />} label="Left On"       value={formatDate(employee.leavingDate)} />}
            {employee.reJoiningDate && <InfoRow icon={<CalendarOutlined />} label="Re-Joined On"  value={formatDate(employee.reJoiningDate)} />}
          </div>

          <Divider style={{ margin: "16px 0 14px" }} />

          <h3 className={styles.sectionTitle}><DollarOutlined style={{ marginRight: 6 }} />Salary Info</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <MiniCard label="Basic Salary"      value={formatCurrency(salaryInfo.basicSalary)}                    color="#64748b" bg="rgba(100,116,139,0.07)" border="rgba(100,116,139,0.2)" />
            <MiniCard label="Base Salary"       value={formatCurrency(salaryInfo.baseSalary)}                     color="#0ea5e9" bg="rgba(14,165,233,0.07)"  border="rgba(14,165,233,0.2)" />
            <MiniCard label="Current Salary"    value={formatCurrency(salaryInfo.currentSalary)}                  color="#7c5cfc" bg="rgba(124,92,252,0.07)" border="rgba(124,92,252,0.2)" />
            <MiniCard label="Total Incremented" value={`+ ${formatCurrency(salaryInfo.totalIncremented)}`}        color="#22c55e" bg="rgba(34,197,94,0.07)"  border="rgba(34,197,94,0.2)" />
            <MiniCard label="No. of Increments" value={salaryInfo.noOfIncrements}                                 color="#3b82f6" bg="rgba(59,130,246,0.07)" border="rgba(59,130,246,0.2)" />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <MiniCard label="Total Earned"      value={formatCurrency(salaryInfo.totalEarned)}                    color="#22c55e" bg="rgba(34,197,94,0.07)"  border="rgba(34,197,94,0.2)" />
            <MiniCard label="Total Paid"        value={formatCurrency(salaryInfo.totalPaid)}                      color="#16a34a" bg="rgba(34,197,94,0.07)"  border="rgba(34,197,94,0.2)" />
            <MiniCard label="Pending Balance"   value={formatCurrency(salaryInfo.pendingBalance)}                 color={salaryInfo.pendingBalance > 0 ? "#ef4444" : "#22c55e"} bg={salaryInfo.pendingBalance > 0 ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)"} border={salaryInfo.pendingBalance > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"} />
            <MiniCard label="Net Settlement"    value={formatCurrency(salaryInfo.netSettlementAmount)}            color="#f97316" bg="rgba(249,115,22,0.07)" border="rgba(249,115,22,0.2)" />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <MiniCard label="Days Worked (This Month)" value={salaryInfo.currentMonthDaysWorked}                  color="#64748b" bg="rgba(100,116,139,0.07)" border="rgba(100,116,139,0.2)" />
            <MiniCard label="Accrued (This Month)"     value={formatCurrency(salaryInfo.currentMonthAccrued)}     color="#7c5cfc" bg="rgba(124,92,252,0.07)" border="rgba(124,92,252,0.2)" />
          </div>
        </div>
      ),
    },
    {
      key: "salary",
      label: <span style={{ fontWeight: 600 }}><DollarOutlined /> Salary History</span>,
      children: (
        <Spin spinning={salaryLoading}>
          <div>
            {unpaidCount > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "10px 16px", marginBottom: 14,
              }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#ef4444", lineHeight: 1 }}>{unpaidCount}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                    {unpaidCount === 1 ? "month has" : "months have"} unpaid salary
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>Review the salary history below</div>
                </div>
              </div>
            )}
            {(() => {
              const tp  = salarySummary?.totalPaid      ?? 0;
              const tb  = salarySummary?.totalBonus     ?? 0;
              const ps  = salarySummary?.pendingSalary  ?? 0;
              const ppc = salarySummary?.partialPendingCount ?? 0;
              const te  = salarySummary?.totalEarned            ?? 0;
              const bs  = salarySummary?.baseSalary             ?? 0;
              const nsa = salarySummary?.netSettlementAmount    ?? 0;
              const dw  = salarySummary?.currentMonthDaysWorked ?? 0;
              const acc = salarySummary?.currentMonthAccrued    ?? 0;
              return (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <MiniCard label="Total Paid"       value={formatCurrency(tp)} color="#22c55e" bg="rgba(34,197,94,0.07)"  border="rgba(34,197,94,0.2)" />
                    <MiniCard label="Total Bonus"      value={formatCurrency(tb)} color="#3b82f6" bg="rgba(59,130,246,0.07)" border="rgba(59,130,246,0.2)" />
                    <MiniCard label="Pending Salary"   value={formatCurrency(ps)} color={ps  > 0 ? "#ef4444" : "#22c55e"} bg={ps  > 0 ? "rgba(239,68,68,0.07)"  : "rgba(34,197,94,0.07)"}  border={ps  > 0 ? "rgba(239,68,68,0.2)"  : "rgba(34,197,94,0.2)"} />
                    <MiniCard label="Partial / Pending" value={ppc}               color={ppc > 0 ? "#f97316" : "#22c55e"} bg={ppc > 0 ? "rgba(249,115,22,0.07)" : "rgba(34,197,94,0.07)"}  border={ppc > 0 ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)"} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                    <MiniCard label="Total Earned"     value={formatCurrency(te)}  color="#22c55e" bg="rgba(34,197,94,0.07)"    border="rgba(34,197,94,0.2)" />
                    <MiniCard label="Base Salary"      value={formatCurrency(bs)}  color="#0ea5e9" bg="rgba(14,165,233,0.07)"   border="rgba(14,165,233,0.2)" />
                    <MiniCard label="Net Settlement"   value={formatCurrency(nsa)} color="#f97316" bg="rgba(249,115,22,0.07)"   border="rgba(249,115,22,0.2)" />
                    <MiniCard label="Days Worked (This Month)" value={dw}                     color="#64748b" bg="rgba(100,116,139,0.07)" border="rgba(100,116,139,0.2)" />
                    <MiniCard label="Accrued (This Month)"     value={formatCurrency(acc)}    color="#7c5cfc" bg="rgba(124,92,252,0.07)"  border="rgba(124,92,252,0.2)" />
                  </div>
                </>
              );
            })()}
            <Table
              dataSource={salaryData}
              rowKey="id"
              size="small"
              pagination={{
                current: salaryPage,
                pageSize: 10,
                total: salaryTotal,
                showSizeChanger: false,
                size: "small",
                onChange: (page) => fetchSalaries(page),
              }}
              expandable={{
                expandedRowRender: (r) => salaryExpandedRow(r),
                rowExpandable: (r) => (r.payments?.length || 0) > 0,
                expandedRowClassName: () => "salary-expanded-row",
                expandIcon: ({ expanded, onExpand, record }) => {
                  const count = record.payments?.length || 0;
                  if (!count) return null;
                  return (
                    <span
                      onClick={(e) => onExpand(record, e)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 20, cursor: "pointer",
                        fontSize: 11, fontWeight: 700,
                        background: expanded ? "rgba(124,92,252,0.15)" : "rgba(124,92,252,0.07)",
                        border: `1px solid ${expanded ? "rgba(124,92,252,0.5)" : "rgba(124,92,252,0.25)"}`,
                        color: "#7c5cfc",
                        transition: "all 0.15s",
                        userSelect: "none",
                      }}
                    >
                      <span style={{ display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 9 }}>▶</span>
                      {count} payment{count !== 1 ? "s" : ""}
                    </span>
                  );
                },
              }}
              locale={{ emptyText: "No salary records" }}
              style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
              rowClassName={(r) => r.status !== "paid" ? "row-unpaid" : ""}
              columns={[
                {
                  title: "Month",     key: "period",    width: 110,
                  render: (_, r) => <span style={{ fontWeight: 700 }}>{MONTHS[(r.month ?? 1) - 1]} {r.year}</span>,
                },
                {
                  title: "Net Salary", key: "net",      width: 120,
                  render: (_, r) => <span style={{ fontWeight: 700 }}>{formatCurrency(r.netSalary)}</span>,
                },
                {
                  title: "Bonus",     key: "bonus",     width: 100,
                  render: (_, r) => r.bonus > 0
                    ? <span style={{ color: "#22c55e", fontWeight: 600 }}>+{formatCurrency(r.bonus)}</span>
                    : <span style={{ color: "#cbd5e1" }}>—</span>,
                },
                {
                  title: "Paid",      key: "paid",      width: 110,
                  render: (_, r) => <span style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(r.amountPaid)}</span>,
                },
                {
                  title: "Remaining", key: "remaining", width: 110,
                  render: (_, r) => {
                    const rem = r.netSalary - r.amountPaid;
                    return rem > 0
                      ? <span style={{ fontWeight: 700, color: "#ef4444" }}>{formatCurrency(rem)}</span>
                      : <span style={{ color: "#22c55e", fontWeight: 700 }}>—</span>;
                  },
                },
                {
                  title: "Status",    key: "status",    width: 100,
                  render: (_, r) => {
                    if (r.status === "paid")    return <Tag color="success" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Paid</Tag>;
                    if (r.status === "partial") return <Tag color="warning" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Partial</Tag>;
                    return                             <Tag color="error"   style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Pending</Tag>;
                  },
                },
                {
                  title: "", key: "slip", width: 40,
                  render: (_, r) => (
                    <AppButton type="text" size="small" icon={<PrinterOutlined />} title="Print Salary Slip"
                      onClick={() => printSalarySlip({ month: r.month, year: r.year, record: r })}
                      loading={slipLoading}
                      style={{ color: "#7c5cfc" }} />
                  ),
                },
              ].filter(Boolean)}
            />
          </div>
        </Spin>
      ),
    },
    {
      key: "increments",
      label: <span style={{ fontWeight: 600 }}><RiseOutlined /> Increments ({incCount})</span>,
      children: (
        <Spin spinning={incrementsLoading}>
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <MiniCard label="Basic Salary"      value={formatCurrency(incrementsSummary?.basicSalary      ?? employee.basicSalary   ?? 0)} color="#64748b" bg="rgba(100,116,139,0.07)" border="rgba(100,116,139,0.2)" />
              <MiniCard label="Current Salary"    value={formatCurrency(incrementsSummary?.currentSalary    ?? employee.currentSalary ?? 0)} color="#7c5cfc" bg="rgba(124,92,252,0.07)"  border="rgba(124,92,252,0.2)" />
              <MiniCard label="Total Incremented" value={formatCurrency(incrementsSummary?.totalIncremented ?? 0)}                           color="#22c55e" bg="rgba(34,197,94,0.07)"   border="rgba(34,197,94,0.2)" />
              <MiniCard label="No. of Increments" value={incrementsSummary?.noOfIncrements ?? incrementsTotal}                              color="#3b82f6" bg="rgba(59,130,246,0.07)"  border="rgba(59,130,246,0.2)" />
            </div>
            <Table
              columns={incColumns}
              dataSource={incrementsData}
              rowKey="id"
              size="small"
              pagination={{
                current: incrementsPage,
                pageSize: 10,
                total: incrementsTotal,
                showSizeChanger: false,
                size: "small",
                onChange: (page) => fetchIncrements(page),
              }}
              locale={{ emptyText: "No increments recorded yet" }}
              style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
            />
          </div>
        </Spin>
      ),
    },
    {
      key: "attendance",
      label: (
        <span style={{ fontWeight: 600 }}>
          <CalendarOutlined /> Attendance
          {attAlert && (
            <span style={{ marginLeft: 6, background: "#f97316", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
              {attAlert}
            </span>
          )}
        </span>
      ),
      children: (
        <Spin spinning={attLoading}>
        <div>
          {/* Month navigator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <AppButton type="text" size="small" icon={<LeftOutlined />} onClick={() => setAttMonth((m) => m.subtract(1, "month"))} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{attMonth.format("MMMM YYYY")}</span>
            <AppButton type="text" size="small" icon={<RightOutlined />} onClick={() => setAttMonth((m) => m.add(1, "month"))} />
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Present",    count: attSummary.present,   color: "#22c55e", bg: "rgba(34,197,94,0.07)",    border: "rgba(34,197,94,0.2)" },
              { label: "Absent",     count: attSummary.absent,    color: "#ef4444", bg: "rgba(239,68,68,0.07)",    border: "rgba(239,68,68,0.2)" },
              { label: "Half Day",   count: attSummary.halfDay,   color: "#f97316", bg: "rgba(249,115,22,0.07)",   border: "rgba(249,115,22,0.2)" },
              { label: "Leave",      count: attSummary.leave,     color: "#3b82f6", bg: "rgba(59,130,246,0.07)",   border: "rgba(59,130,246,0.2)" },
              { label: "Off Days",   count: attSummary.offDays,   color: "#94a3b8", bg: "rgba(148,163,184,0.07)",  border: "rgba(148,163,184,0.2)" },
              { label: "Not Marked", count: attSummary.notMarked, color: "#64748b", bg: "rgba(100,116,139,0.07)",  border: "rgba(100,116,139,0.2)" },
            ].map(({ label, count, color, bg, border }) => (
              <div key={label} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, background: bg, border: `1px solid ${border}`, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{count}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4, textAlign: "center" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", padding: "2px 0" }}>{day}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {attCells.map((cell) => {
                if (cell.empty) return <div key={cell.key} />;
                const { d, isOff, status, badge, date } = cell;
                const cellBase = { height: 48, borderRadius: 7, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };
                const sc = ATT_C[status] ?? null;
                const isSelected = editDay?.date === date;
                return (
                  <div
                    key={date}
                    title={status && status !== "not_marked" ? `${status.replace(/_/g, " ")} · Click to edit` : "Not marked · Click to add"}
                    onClick={() => {
                      const log = (attData?.logs ?? []).find((l) => l.date === date);
                      setEditDay({ date, status: (!status || status === "not_marked" || status === "weekly_off") ? "present" : (log?.statusCode || status), remarks: log?.remarks || "", logId: log?.id ?? null });
                    }}
                    style={{
                      ...cellBase,
                      cursor: "pointer",
                      background: sc ? sc.bg : "transparent",
                      border: isSelected ? "2px solid #7c5cfc" : `1.5px ${sc ? "solid" : "dashed"} ${sc ? sc.border : "var(--color-border)"}`,
                      boxShadow: isSelected ? "0 0 0 3px rgba(124,92,252,0.15)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#7c5cfc" : sc?.color || "var(--color-text-secondary)" }}>{d}</span>
                    {badge && <span style={{ fontSize: 8, fontWeight: 800, color: isSelected ? "#7c5cfc" : sc?.color || "#94a3b8" }}>{badge}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendance day modal — rendered inside tab, z-index stacks above parent modal */}

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
            {Object.entries(ATT_C).filter(([k]) => k !== "weekly_off").map(([k, v]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: v.color }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: v.bg, border: `1.5px solid ${v.border}`, display: "inline-block" }} />
                {k.replace(/_/g, " ")}
              </span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>· Dashed = Not Marked</span>
          </div>

          {/* Records table */}
          <Table
            dataSource={[...(attData?.logs ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date))}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{ emptyText: "No attendance records for this month" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
            columns={[
              { title: "Date",    dataIndex: "date",    key: "date", width: "14%",
                render: (v) => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span> },
              { title: "Day",     dataIndex: "dayName", key: "day",  width: "10%",
                render: (v) => <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{v}</span> },
              { title: "Status",  key: "status", width: "16%",
                render: (_, r) => {
                  const cfg = {
                    present:      { color: "success",    label: "Present"      },
                    absent:       { color: "error",      label: "Absent"       },
                    half_paid:    { color: "warning",    label: "Half Day (P)" },
                    half_unpaid:  { color: "volcano",    label: "Half Day (U)" },
                    leave_paid:   { color: "processing", label: "Leave (P)"    },
                    leave_unpaid: { color: "purple",     label: "Leave (U)"    },
                  }[r.statusCode] || { color: "default", label: r.status };
                  return <Tag color={cfg.color} style={{ borderRadius: 5, fontWeight: 600, fontSize: 11 }}>{cfg.label}</Tag>;
                }},
              { title: "Remarks", dataIndex: "remarks", key: "rem",
                render: (v) => <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{v || "—"}</span> },
            ]}
          />
        </div>
        </Spin>
      ),
    },
    {
      key: "advances",
      label: <span style={{ fontWeight: 600 }}><CreditCardOutlined /> Advances ({advCount})</span>,
      children: (
        <Spin spinning={advancesLoading}>
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <MiniCard label="Outstanding Balance" value={formatCurrency(advancesSummary?.outstandingBalance ?? advanceBalance)} color="#ef4444" bg="rgba(239,68,68,0.07)"  border="rgba(239,68,68,0.2)" />
              <MiniCard label="Total Given"         value={formatCurrency(advancesSummary?.totalGiven        ?? 0)}               color="#f97316" bg="rgba(249,115,22,0.07)" border="rgba(249,115,22,0.2)" />
              <MiniCard label="Total Recovered"     value={formatCurrency(advancesSummary?.totalRecovered    ?? 0)}               color="#22c55e" bg="rgba(34,197,94,0.07)"  border="rgba(34,197,94,0.2)" />
            </div>
            <Table
              columns={advColumns}
              dataSource={advancesData}
              rowKey="id"
              size="small"
              pagination={{
                current: advancesPage,
                pageSize: 10,
                total: advancesTotal,
                showSizeChanger: false,
                size: "small",
                onChange: (page) => fetchAdvances(page),
              }}
              scroll={{ x: 700 }}
              locale={{ emptyText: "No advance records" }}
              style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
            />
          </div>
        </Spin>
      ),
    },
  ];

  return (
    <>
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
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {employee.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className={styles.name}>{employee.name}</h2>
            <p className={styles.sub}>{employee.designation} &nbsp;·&nbsp; {employee.department} &nbsp;·&nbsp; {employee.empNo}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <Tag color={employee.status === "active" ? "success" : "default"}
                style={{ borderRadius: 6, fontWeight: 600, textTransform: "capitalize", margin: 0 }}>
                {employee.status}
              </Tag>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: unpaidCount > 0 ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                border: `1px solid ${unpaidCount > 0 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                borderRadius: 6, padding: "2px 8px",
                fontSize: 11, fontWeight: 700,
                color: unpaidCount > 0 ? "#ef4444" : "#16a34a",
              }}>
                {unpaidCount} Unpaid {unpaidCount === 1 ? "Salary" : "Salaries"}
              </span>
            </div>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Overall summary cards */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px 4px" }}>
          <StatCard label="Current Salary"    value={formatCurrency(topMetrics.currentSalary)}  color="#7c5cfc" />
          <StatCard label="Pending Salary"    value={formatCurrency(topMetrics.pendingSalary)}   color={topMetrics.pendingSalary > 0 ? "#ef4444" : "#22c55e"} />
          <StatCard label="Advance Balance"   value={formatCurrency(topMetrics.advanceBalance)}  color={topMetrics.advanceBalance > 0 ? "#f97316" : "#22c55e"} />
          <StatCard label="Salary Records"    value={topMetrics.salaryRecordsCount}              color="#3b82f6" />
          <StatCard label="No. of Increments" value={topMetrics.noOfIncrements}                  color="#22c55e" />
        </div>

        <div style={{ padding: "8px 24px 24px" }}>
          <Tabs items={tabItems} activeKey={activeTab} onChange={handleTabChange} />
        </div>
      </div>

      {/* ── Attendance day modal ── */}
      {(() => {
        if (!editDay) return null;
        const edMain      = getAttMain(editDay.status);
        const edPaid      = getAttPaid(editDay.status);
        const edNeedsSub  = edMain === "half" || edMain === "leave";
        const edMainColor = EDIT_MAIN.find((s) => s.v === edMain)?.color || "#22c55e";
        const isUpdate    = !!editDay.logId;
        const dateLabel   = new Date(editDay.date + "T00:00:00").toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

        return (
          <Modal
            open
            onCancel={() => setEditDay(null)}
            width={480}
            centered
            destroyOnClose
            closable={false}
            footer={null}
            styles={{ body: { padding: 0 } }}
            zIndex={1100}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#7c5cfc", marginBottom: 4 }}>
                    {isUpdate ? "Update Attendance" : "Mark Attendance"}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)" }}>{dateLabel}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {isUpdate ? "Change the attendance record for this day." : "No record exists yet — mark this day."}
                  </div>
                </div>
                <button onClick={() => setEditDay(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1, padding: 4 }}>✕</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px" }}>
              {/* Status buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: edNeedsSub ? 16 : 20 }}>
                {EDIT_MAIN.map((s) => {
                  const sel = edMain === s.v;
                  return (
                    <button
                      key={s.v}
                      onClick={() => {
                        if (s.v === "present" || s.v === "absent") {
                          setEditDay((p) => ({ ...p, status: s.v }));
                        } else {
                          const keepPaid = edMain === s.v ? edPaid : true;
                          setEditDay((p) => ({ ...p, status: buildAttSt(s.v, keepPaid) }));
                        }
                      }}
                      style={{
                        height: 52, borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                        border: `2px solid ${sel ? s.color : "var(--color-border)"}`,
                        background: sel ? s.color + "18" : "var(--color-bg-secondary)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      <span style={{ width: 28, height: 28, borderRadius: 7, background: sel ? s.color : "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: sel ? "#fff" : "var(--color-text-secondary)", flexShrink: 0 }}>
                        {s.label}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: sel ? s.color : "var(--color-text-secondary)" }}>{s.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Paid / Unpaid sub-toggle */}
              {edNeedsSub && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--color-text-secondary)", marginBottom: 8 }}>
                    {edMain === "half" ? "Half Day" : "Leave"} Type
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ v: true, label: "Paid", hint: "Salary not deducted" }, { v: false, label: "Unpaid", hint: "Salary will be deducted" }].map(({ v, label, hint }) => (
                      <button
                        key={label}
                        onClick={() => setEditDay((p) => ({ ...p, status: buildAttSt(edMain, v) }))}
                        style={{
                          flex: 1, height: 46, borderRadius: 9, cursor: "pointer", transition: "all 0.15s",
                          border: `2px solid ${edPaid === v ? edMainColor : "var(--color-border)"}`,
                          background: edPaid === v ? edMainColor + "18" : "var(--color-bg-secondary)",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13, color: edPaid === v ? edMainColor : "var(--color-text-secondary)" }}>{label}</span>
                        <span style={{ fontSize: 10, color: edPaid === v ? edMainColor : "var(--color-text-secondary)", opacity: 0.8 }}>{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--color-text-secondary)", marginBottom: 8 }}>Remarks (optional)</div>
                <input
                  placeholder="Add a note..."
                  value={editDay.remarks}
                  onChange={(e) => setEditDay((p) => ({ ...p, remarks: e.target.value }))}
                  style={{ width: "100%", height: 38, borderRadius: 8, border: "1.5px solid var(--color-border)", padding: "0 12px", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text)", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Footer actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <AppButton onClick={() => setEditDay(null)}>Cancel</AppButton>
                <AppButton
                  type="primary"
                  className="btn-dark"
                  loading={saveDayLoading}
                  onClick={async () => {
                    const uiSt = editDay.status;
                    let apiStatus, subType;
                    if (uiSt === "present" || uiSt === "absent")         { apiStatus = uiSt;       subType = null; }
                    else if (uiSt === "half_paid"  || uiSt === "half")   { apiStatus = "half_day"; subType = "paid"; }
                    else if (uiSt === "half_unpaid")                      { apiStatus = "half_day"; subType = "unpaid"; }
                    else if (uiSt === "leave_paid" || uiSt === "leave")  { apiStatus = "leave";    subType = "paid"; }
                    else if (uiSt === "leave_unpaid")                     { apiStatus = "leave";    subType = "unpaid"; }
                    else { apiStatus = uiSt; subType = null; }
                    setSaveDayLoading(true);
                    try {
                      if (editDay.logId) {
                        await updateAttendance(editDay.logId, { employee: employee.id, date: editDay.date, status: apiStatus, ...(subType && { subType }), remarks: editDay.remarks });
                      } else {
                        await createAttendance({
                          employee: employee.id,
                          date: editDay.date,
                          status: apiStatus,
                          ...(subType && { subType }),
                          remarks: editDay.remarks,
                        });
                      }
                      setEditDay(null);
                      fetchAttendance(attMonth);
                    } finally {
                      setSaveDayLoading(false);
                    }
                  }}
                >
                  {isUpdate ? "Update" : "Save"}
                </AppButton>
              </div>
            </div>
          </Modal>
        );
      })()}
    </Modal>

    <SalarySlipModal
      open={slipOpen}
      onClose={() => setSlipOpen(false)}
      data={slipData}
    />
    </>
  );
};

export default EmployeeDetailModal;

