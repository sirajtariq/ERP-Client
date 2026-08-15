import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Modal, Tabs, Table, Tag, Divider, Popconfirm } from "antd";
import {
  UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  IdcardOutlined, CalendarOutlined, RiseOutlined, DollarOutlined,
  CreditCardOutlined, DeleteOutlined, LeftOutlined, RightOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import { getCompanyInfo } from "@/utils/companyInfoStore";
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

  const empAttForMonth = useMemo(
    () => empAttendance.filter((a) => {
      const d = dayjs(a.date);
      return d.year() === attMonth.year() && d.month() === attMonth.month();
    }),
    [empAttendance, attMonth]
  );

  const attTotals = useMemo(() => ({
    absents:  empAttendance.filter((a) => a.status === "absent").length,
    leaves:   empAttendance.filter((a) => a.status?.startsWith("leave")).length,
    halfDays: empAttendance.filter((a) => a.status?.startsWith("half")).length,
  }), [empAttendance]);

  const attStats = useMemo(() => {
    const dim = attMonth.daysInMonth();
    let offs = 0;
    for (let d = 1; d <= dim; d++) if (attMonth.date(d).day() === 5) offs++;
    const working = dim - offs;
    const p  = empAttForMonth.filter((a) => a.status === "present").length;
    const ab = empAttForMonth.filter((a) => a.status === "absent").length;
    const h  = empAttForMonth.filter((a) => a.status?.startsWith("half")).length;
    const l  = empAttForMonth.filter((a) => a.status?.startsWith("leave")).length;
    return { present: p, absent: ab, half: h, leave: l, offs, notMarked: Math.max(0, working - p - ab - h - l) };
  }, [empAttForMonth, attMonth]);

  const buildSalarySlipHTML = (row) => {
    const { month, year, record } = row;
    const co = getCompanyInfo();
    const monthStr  = `${year}-${String(month).padStart(2, "0")}`;
    const monthName = new Date(year, month - 1, 1).toLocaleString("en-PK", { month: "long", year: "numeric" });
    const printDate = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" });
    const slipNo    = `SS-${year}${String(month).padStart(2, "0")}-${(employee.empNo || "").replace("-", "")}`;

    const monthAtt = empAttendance.filter((a) => a.date.startsWith(monthStr));
    const dim = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= dim; d++) {
      if (new Date(year, month - 1, d).getDay() !== 5) workingDays++;
    }
    const fridaysOff = dim - workingDays;

    const present      = monthAtt.filter((a) => a.status === "present").length;
    const absent       = monthAtt.filter((a) => a.status === "absent").length;
    const halfPaid     = monthAtt.filter((a) => a.status === "half_paid").length;
    const halfUnpaid   = monthAtt.filter((a) => a.status === "half_unpaid").length;
    const leavePaid    = monthAtt.filter((a) => a.status === "leave_paid").length;
    const leaveUnpaid  = monthAtt.filter((a) => a.status === "leave_unpaid").length;
    const notMarked    = Math.max(0, workingDays - present - absent - halfPaid - halfUnpaid - leavePaid - leaveUnpaid);

    const monthlySalary = employee.currentSalary || 0;
    const perDay        = workingDays > 0 ? monthlySalary / workingDays : 0;
    const absentDeduct      = absent      * perDay;
    const halfUnpaidDeduct  = halfUnpaid  * (perDay / 2);
    const leaveUnpaidDeduct = leaveUnpaid * perDay;
    const attDeduct     = absentDeduct + halfUnpaidDeduct + leaveUnpaidDeduct;
    const bonus         = record?.bonus         || 0;
    const manualDeduct  = record?.deductions    || 0;
    const advDeduct     = record?.advanceDeduction || 0;
    const totalDeduct   = attDeduct + manualDeduct + advDeduct;
    const grossEarnings = monthlySalary + bonus;
    const netPay        = record?.netSalary ?? (grossEarnings - totalDeduct);
    const amountPaid    = record?.amountPaid  || 0;
    const remaining     = netPay - amountPaid;

    const fc = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const attRow = (label, val, color, hint) => `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;border-right:1px solid #e2e8f0;min-width:0;flex:1;">
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px;text-align:center;">${label}</div>
        <div style="font-size:22px;font-weight:800;color:${color};">${val}</div>
        ${hint ? `<div style="font-size:9px;color:#94a3b8;margin-top:2px;">${hint}</div>` : ""}
      </div>`;

    const earnRow = (label, val, color) => `
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">${label}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;text-align:right;color:${color || "#1e293b"};">${fc(val)}</td>
      </tr>`;

    const dedRow = (label, val, sub) => val > 0 ? `
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">${label}${sub ? `<span style="font-size:10px;color:#94a3b8;margin-left:6px;">${sub}</span>` : ""}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;text-align:right;color:#ef4444;">- ${fc(val)}</td>
      </tr>` : "";

    const paymentRows = (record?.payments || []).map((p) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${p.date}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;font-weight:700;">${fc(p.amount)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${p.method}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;color:#475569;">${p.paidBy || "—"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;color:#475569;">${p.remarks || "—"}</td>
      </tr>`).join("");

    const absRemark = monthAtt.filter((a) => a.status === "absent" && a.remarks).map((a) => `${a.date}: ${a.remarks}`).join(", ");
    const halfURemark = monthAtt.filter((a) => a.status === "half_unpaid" && a.remarks).map((a) => `${a.date}: ${a.remarks}`).join(", ");
    const leaveURemark = monthAtt.filter((a) => a.status === "leave_unpaid" && a.remarks).map((a) => `${a.date}: ${a.remarks}`).join(", ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Salary Slip — ${employee.name} — ${monthName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 780px; margin: 24px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; padding: 10px 20px 6px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
  @media print {
    body { background: #fff; }
    .page { border: none; border-radius: 0; margin: 0; max-width: 100%; }
    @page { margin: 15mm; size: A4 portrait; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:20px 28px;border-bottom:2px solid #141423;">
    <div>
      <h1 style="font-size:20px;font-weight:800;margin:0 0 4px;">${co.name || "Company Name"}</h1>
      ${co.address ? `<p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Address:</strong> ${co.address}</p>` : ""}
      ${co.contact ? `<p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Tel:</strong> ${co.contact}${co.whatsapp ? `&nbsp;&nbsp;<strong>WhatsApp:</strong> ${co.whatsapp}` : ""}</p>` : ""}
      ${co.email   ? `<p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Email:</strong> ${co.email}</p>` : ""}
    </div>
    <div style="text-align:right;">
      <h2 style="font-size:18px;font-weight:800;color:#141423;margin:0 0 6px;">SALARY SLIP</h2>
      <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Month:</strong> ${monthName}</p>
      <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Slip No:</strong> ${slipNo}</p>
      <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Printed:</strong> ${printDate}</p>
    </div>
  </div>

  <!-- EMPLOYEE DETAILS -->
  <div class="section-title">Employee Information</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #e2e8f0;">
    <div style="padding:10px 20px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Employee Name</div>
      <div style="font-size:14px;font-weight:700;">${employee.name}</div>
    </div>
    <div style="padding:10px 20px;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Employee No.</div>
      <div style="font-size:14px;font-weight:700;">${employee.empNo || "—"}</div>
    </div>
    <div style="padding:10px 20px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Designation</div>
      <div style="font-size:13px;font-weight:600;">${employee.designation || "—"}</div>
    </div>
    <div style="padding:10px 20px;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Department</div>
      <div style="font-size:13px;font-weight:600;">${employee.department || "—"}</div>
    </div>
    <div style="padding:10px 20px;border-right:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Joining Date</div>
      <div style="font-size:13px;font-weight:600;">${employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
    </div>
    <div style="padding:10px 20px;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Status</div>
      <div style="font-size:13px;font-weight:700;color:${employee.status === "active" ? "#22c55e" : "#ef4444"};text-transform:capitalize;">${employee.status}</div>
    </div>
  </div>

  <!-- ATTENDANCE SUMMARY -->
  <div class="section-title">Attendance Summary — ${monthName} (Working Days: ${workingDays} | Month Days: ${dim})</div>
  <div style="display:flex;border-bottom:1px solid #e2e8f0;">
    ${attRow("Present",       present,      "#22c55e")}
    ${attRow("Absent",        absent,       "#ef4444",  absent      > 0 ? "deducted" : "")}
    ${attRow("Half Day (P)",  halfPaid,     "#f97316",  "no deduct")}
    ${attRow("Half Day (U)",  halfUnpaid,   "#c2410c",  halfUnpaid  > 0 ? "deducted" : "no deduct")}
    ${attRow("Leave (P)",     leavePaid,    "#3b82f6",  "no deduct")}
    ${attRow("Leave (U)",     leaveUnpaid,  "#7c3aed",  leaveUnpaid > 0 ? "deducted" : "no deduct")}
    ${attRow("Fri. Off",      fridaysOff,   "#94a3b8")}
    ${notMarked > 0 ? attRow("Unmarked", notMarked, "#cbd5e1") : ""}
  </div>
  ${absRemark || halfURemark || leaveURemark ? `
  <div style="padding:8px 20px;background:#fffbeb;border-bottom:1px solid #fef3c7;font-size:11px;color:#92400e;">
    <span style="font-weight:700;">Remarks:</span>
    ${absRemark    ? `<span style="margin-left:8px;"><b>Absent:</b> ${absRemark}</span>`       : ""}
    ${halfURemark  ? `<span style="margin-left:8px;"><b>Half Unpaid:</b> ${halfURemark}</span>` : ""}
    ${leaveURemark ? `<span style="margin-left:8px;"><b>Leave Unpaid:</b> ${leaveURemark}</span>` : ""}
  </div>` : ""}

  <!-- EARNINGS & DEDUCTIONS -->
  <div class="section-title">Earnings &amp; Deductions</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:2px solid #e2e8f0;">
    <div style="border-right:2px solid #e2e8f0;">
      <div style="padding:8px 14px;background:#f0fdf4;border-bottom:1px solid #dcfce7;">
        <span style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.3px;">Earnings</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${earnRow("Monthly Salary", monthlySalary, "#1e293b")}
        ${bonus > 0 ? earnRow("Bonus / Incentive", bonus, "#22c55e") : ""}
      </table>
      <div style="padding:10px 14px;background:#f0fdf4;border-top:1px solid #dcfce7;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;">Gross Earnings</span>
        <span style="font-size:15px;font-weight:800;color:#16a34a;">${fc(grossEarnings)}</span>
      </div>
    </div>
    <div>
      <div style="padding:8px 14px;background:#fef2f2;border-bottom:1px solid #fecaca;">
        <span style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.3px;">Deductions</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${dedRow(`Absent (${absent} day${absent !== 1 ? "s" : ""})`, absentDeduct)}
        ${dedRow(`Half Day Unpaid (${halfUnpaid})`,    halfUnpaidDeduct)}
        ${dedRow(`Leave Unpaid (${leaveUnpaid})`,      leaveUnpaidDeduct)}
        ${dedRow("Advance Deduction",                  advDeduct)}
        ${dedRow("Other Deductions",                   manualDeduct)}
        ${totalDeduct === 0 ? `<tr><td colspan="2" style="padding:8px 14px;font-size:12px;color:#94a3b8;font-style:italic;">No deductions this month</td></tr>` : ""}
      </table>
      <div style="padding:10px 14px;background:#fef2f2;border-top:1px solid #fecaca;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;">Total Deductions</span>
        <span style="font-size:15px;font-weight:800;color:#dc2626;">${fc(totalDeduct)}</span>
      </div>
    </div>
  </div>

  <!-- NET PAY -->
  <div style="background:linear-gradient(135deg,#7c5cfc 0%,#6d48ef 100%);padding:18px 28px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Net Pay for ${monthName}</div>
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${fc(netPay)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-bottom:4px;">Paid so far</div>
      <div style="font-size:16px;font-weight:700;color:#86efac;">${fc(amountPaid)}</div>
      ${remaining > 0 ? `
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:6px;margin-bottom:2px;">Remaining</div>
      <div style="font-size:16px;font-weight:700;color:#fca5a5;">${fc(remaining)}</div>` : `
      <div style="margin-top:8px;padding:4px 12px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:12px;font-weight:700;color:#fff;">FULLY PAID</div>`}
    </div>
  </div>

  ${(record?.payments?.length || 0) > 0 ? `
  <!-- PAYMENT HISTORY -->
  <div class="section-title">Payment History</div>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase;">Date</th>
        <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase;">Amount</th>
        <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase;">Method</th>
        <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase;">Paid By</th>
        <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase;">Remarks</th>
      </tr>
    </thead>
    <tbody>${paymentRows}</tbody>
  </table>` : ""}

  <!-- FOOTER -->
  <div style="padding:24px 28px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;">
    <div style="font-size:10px;color:#94a3b8;">
      <div>Generated by system</div>
      <div>This is a computer-generated document.</div>
    </div>
    <div style="text-align:center;">
      <div style="width:160px;border-top:1.5px solid #334155;padding-top:6px;font-size:11px;font-weight:600;color:#475569;">Authorized Signature</div>
    </div>
  </div>

</div>
</body>
</html>`;
  };

  const printSalarySlip = (row) => {
    const html = buildSalarySlipHTML(row);
    const win  = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  if (!employee) return null;

  const totalIncremented = (employee.currentSalary || 0) - (employee.basicSalary || 0);

  // ── Attendance calendar cells ──
  const attDim    = attMonth.daysInMonth();
  const attOffset = attMonth.startOf("month").day() === 0 ? 6 : attMonth.startOf("month").day() - 1;
  const attDayMap = {};
  empAttForMonth.forEach((a) => { attDayMap[parseInt(a.date.slice(-2), 10)] = a; });
  const attCells  = [];
  for (let i = 0; i < attOffset; i++) attCells.push({ key: `e${i}`, empty: true });
  for (let d = 1; d <= attDim; d++) attCells.push({ d, isOff: (attOffset + d - 1) % 7 === 4, rec: attDayMap[d] || null });

  const ATT_C = {
    present:      { bg: "rgba(34,197,94,0.15)",  border: "#22c55e", color: "#16a34a", label: "P"  },
    absent:       { bg: "rgba(239,68,68,0.15)",  border: "#ef4444", color: "#dc2626", label: "A"  },
    half_paid:    { bg: "rgba(249,115,22,0.12)", border: "#f97316", color: "#ea580c", label: "½P" },
    half_unpaid:  { bg: "rgba(249,115,22,0.22)", border: "#c2410c", color: "#c2410c", label: "½U" },
    leave_paid:   { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", color: "#2563eb", label: "LP" },
    leave_unpaid: { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", color: "#7c3aed", label: "LU" },
  };

  const salaryExpandedRow = (record) => {
    const cols = [
      { title: "Date",    dataIndex: "date",   key: "date",   width: 110, render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span> },
      { title: "Amount",  dataIndex: "amount", key: "amount", width: 110, render: (v) => <span style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(v)}</span> },
      { title: "Method",  dataIndex: "method", key: "method", width: 120, render: (v) => <Tag style={{ borderRadius: 4, fontSize: 11 }}>{v}</Tag> },
      { title: "Paid By", dataIndex: "paidBy", key: "paidBy", render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v}</span> },
      { title: "Remarks", dataIndex: "remarks",key: "remarks",render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v || "—"}</span> },
    ];
    return <Table columns={cols} dataSource={record.payments || []} rowKey="id" size="small" pagination={false} style={{ margin: "4px 0" }} />;
  };

  // ── Increment columns ──
  const incColumns = [
    { title: "Effective Date",  dataIndex: "effectiveDate",  key: "date", width: "14%", render: (v) => <span style={{ fontWeight: 600 }}>{formatDate(v)}</span> },
    { title: "Previous Salary", dataIndex: "previousSalary", key: "prev", width: "16%", render: (v) => <span style={{ color: "#64748b" }}>{formatCurrency(v)}</span> },
    { title: "Increment",       dataIndex: "incrementAmount",key: "inc",  width: "13%", render: (v) => <span style={{ fontWeight: 700, color: "#22c55e" }}>+{formatCurrency(v)}</span> },
    { title: "New Salary",      dataIndex: "newSalary",      key: "new",  width: "15%", render: (v) => <span style={{ fontWeight: 800, color: "#7c5cfc" }}>{formatCurrency(v)}</span> },
    { title: "Reason",          dataIndex: "reason",         key: "reason", ellipsis: true, render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v}</span> },
    { title: "Approved By",     dataIndex: "approvedBy",     key: "appr", width: "13%", render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v || "—"}</span> },
    onDeleteIncrement && {
      title: "", key: "action", width: "5%",
      render: (_, r) => (
        <Popconfirm title="Delete this increment?" onConfirm={() => onDeleteIncrement(r.id)} okText="Delete" cancelText="No" okType="danger">
          <AppButton type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ].filter(Boolean);

  // ── Advance columns ──
  const advColumns = [
    { title: "Date",        dataIndex: "date",          key: "date",   width: "13%", render: (v) => <span style={{ fontWeight: 600, fontSize: 12 }}>{formatDate(v)}</span> },
    { title: "Amount",      dataIndex: "amount",        key: "amount", width: "14%", render: (v) => <span style={{ fontWeight: 700, color: "#f97316" }}>{formatCurrency(v)}</span> },
    { title: "Deducted",    dataIndex: "deductedAmount",key: "ded",    width: "13%", render: (v) => <span style={{ color: "#22c55e", fontWeight: 600 }}>{formatCurrency(v || 0)}</span> },
    { title: "Remaining",   key: "remaining", width: "13%",
      render: (_, r) => { const rem = r.amount - (r.deductedAmount || 0); return <span style={{ fontWeight: 700, color: rem > 0 ? "#ef4444" : "#22c55e" }}>{formatCurrency(rem)}</span>; }},
    { title: "Status",      dataIndex: "status",        key: "status", width: "10%",
      render: (v) => <Tag color={ADV_COLOR[v] || "default"} style={{ borderRadius: 5, fontWeight: 600, textTransform: "capitalize" }}>{v}</Tag> },
    { title: "Method",      dataIndex: "paymentMethod", key: "method", width: "13%", render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v}</span> },
    { title: "Reason",      dataIndex: "reason",        key: "reason", ellipsis: true, render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v}</span> },
    onDeleteAdvance && {
      title: "", key: "action", width: "5%",
      render: (_, r) => (
        <Popconfirm title="Delete this advance?" onConfirm={() => onDeleteAdvance(r.id)} okText="Delete" cancelText="No" okType="danger">
          <AppButton type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
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
          <div className={styles.infoBox}>
            <InfoRow icon={<DollarOutlined />} label="Basic Salary"      value={formatCurrency(employee.basicSalary || 0)} />
            <InfoRow icon={<DollarOutlined />} label="Current Salary"    value={formatCurrency(employee.currentSalary || 0)} />
            <InfoRow icon={<RiseOutlined />}   label="Total Incremented" value={`+ ${formatCurrency(totalIncremented)}`} />
            <InfoRow icon={<RiseOutlined />}   label="No. of Increments" value={empIncrements.length} />
          </div>
        </div>
      ),
    },
    {
      key: "salary",
      label: (
        <span style={{ fontWeight: 600 }}>
          <DollarOutlined /> Salary History
          {unpaidMonthCount > 0 && (
            <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
              {unpaidMonthCount} unpaid
            </span>
          )}
        </span>
      ),
      children: (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <MiniCard label="Total Paid"      value={formatCurrency(totalPaidYTD)}         color="#22c55e" bg="rgba(34,197,94,0.07)"    border="rgba(34,197,94,0.2)" />
            <MiniCard label="Total Bonus"     value={formatCurrency(totalBonusYTD)}         color="#3b82f6" bg="rgba(59,130,246,0.07)"   border="rgba(59,130,246,0.2)" />
            <MiniCard label="Pending Salary"  value={formatCurrency(totalPendingSalary)}    color={totalPendingSalary > 0 ? "#ef4444" : "#22c55e"} bg={totalPendingSalary > 0 ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)"} border={totalPendingSalary > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"} />
            <MiniCard label="Partial / Pending" value={unpaidMonthCount}                    color={unpaidMonthCount > 0 ? "#f97316" : "#22c55e"} bg={unpaidMonthCount > 0 ? "rgba(249,115,22,0.07)" : "rgba(34,197,94,0.07)"} border={unpaidMonthCount > 0 ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)"} />
          </div>
          <Table
            dataSource={monthTimeline}
            rowKey="key"
            size="small"
            pagination={{ pageSize: 12, showSizeChanger: false, size: "small" }}
            expandable={{
              expandedRowRender: (row) => row.record ? salaryExpandedRow(row.record) : null,
              rowExpandable: (row) => (row.record?.payments?.length || 0) > 0,
            }}
            locale={{ emptyText: "No months to display" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
            rowClassName={(row) => (!row.record || row.record.status !== "paid") ? "row-unpaid" : ""}
            columns={[
              {
                title: "Month",
                key: "period",
                width: "12%",
                render: (_, row) => (
                  <span style={{ fontWeight: 700 }}>
                    {MONTHS[row.month - 1]} {row.year}
                  </span>
                ),
              },
              {
                title: "Net Salary",
                key: "net",
                width: "13%",
                render: (_, row) => row.record
                  ? <span style={{ fontWeight: 700 }}>{formatCurrency(row.record.netSalary)}</span>
                  : <span style={{ color: "#cbd5e1" }}>—</span>,
              },
              {
                title: "Bonus",
                key: "bonus",
                width: "10%",
                render: (_, row) => row.record?.bonus
                  ? <span style={{ color: "#22c55e", fontWeight: 600 }}>+{formatCurrency(row.record.bonus)}</span>
                  : <span style={{ color: "#cbd5e1" }}>—</span>,
              },
              {
                title: "Paid",
                key: "paid",
                width: "12%",
                render: (_, row) => row.record
                  ? <span style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(row.record.amountPaid || 0)}</span>
                  : <span style={{ color: "#cbd5e1" }}>—</span>,
              },
              {
                title: "Remaining",
                key: "remaining",
                width: "12%",
                render: (_, row) => {
                  if (!row.record) return <span style={{ color: "#cbd5e1" }}>—</span>;
                  const rem = row.record.netSalary - (row.record.amountPaid || 0);
                  return rem > 0
                    ? <span style={{ fontWeight: 700, color: "#ef4444" }}>{formatCurrency(rem)}</span>
                    : <span style={{ color: "#22c55e", fontWeight: 700 }}>—</span>;
                },
              },
              {
                title: "Status",
                key: "status",
                width: "13%",
                render: (_, row) => {
                  if (!row.record) return <Tag style={{ borderRadius: 5, fontWeight: 600, fontSize: 11, color: "#94a3b8", borderColor: "#e2e8f0", background: "#f8fafc" }}>No Record</Tag>;
                  if (row.record.status === "paid")    return <Tag color="success" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Paid</Tag>;
                  if (row.record.status === "partial") return <Tag color="warning" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Partial</Tag>;
                  return                                      <Tag color="error"   style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Pending</Tag>;
                },
              },
              {
                title: "",
                key: "slip",
                width: "6%",
                render: (_, row) => row.record ? (
                  <AppButton
                    type="text"
                    size="small"
                    icon={<PrinterOutlined />}
                    title="Print Salary Slip"
                    onClick={() => printSalarySlip(row)}
                    style={{ color: "#7c5cfc" }}
                  />
                ) : null,
              },
              onDeleteSalaryRecord && {
                title: "",
                key: "action",
                width: "5%",
                render: (_, row) => row.record ? (
                  <Popconfirm title="Delete this salary record?" onConfirm={() => onDeleteSalaryRecord(row.record.id)} okText="Delete" cancelText="No" okType="danger">
                    <AppButton type="text" size="small" icon={<DeleteOutlined />} danger />
                  </Popconfirm>
                ) : null,
              },
            ].filter(Boolean)}
          />
        </div>
      ),
    },
    {
      key: "increments",
      label: <span style={{ fontWeight: 600 }}><RiseOutlined /> Increments ({empIncrements.length})</span>,
      children: (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <MiniCard label="Basic Salary"      value={formatCurrency(employee.basicSalary || 0)}   color="#64748b" bg="rgba(100,116,139,0.07)" border="rgba(100,116,139,0.2)" />
            <MiniCard label="Current Salary"    value={formatCurrency(employee.currentSalary || 0)} color="#7c5cfc" bg="rgba(124,92,252,0.07)"  border="rgba(124,92,252,0.2)" />
            <MiniCard label="Total Incremented" value={formatCurrency(totalIncremented)}             color="#22c55e" bg="rgba(34,197,94,0.07)"   border="rgba(34,197,94,0.2)" />
            <MiniCard label="No. of Increments" value={empIncrements.length}                        color="#3b82f6" bg="rgba(59,130,246,0.07)"  border="rgba(59,130,246,0.2)" />
          </div>
          <Table
            columns={incColumns}
            dataSource={[...empIncrements].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            locale={{ emptyText: "No increments recorded yet" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
          />
        </div>
      ),
    },
    {
      key: "attendance",
      label: (
        <span style={{ fontWeight: 600 }}>
          <CalendarOutlined /> Attendance
          {attStats.absent > 0 && (
            <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
              {attStats.absent}A
            </span>
          )}
        </span>
      ),
      children: (
        <div>
          {/* Overall totals */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Total Absents",  value: attTotals.absents,  color: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.2)" },
              { label: "Total Leaves",   value: attTotals.leaves,   color: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.2)" },
              { label: "Total Half Days",value: attTotals.halfDays, color: "#f97316", bg: "rgba(249,115,22,0.07)",  border: "rgba(249,115,22,0.2)" },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Month navigator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <AppButton type="text" size="small" icon={<LeftOutlined />} onClick={() => setAttMonth((m) => m.subtract(1, "month"))} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{attMonth.format("MMMM YYYY")}</span>
            <AppButton type="text" size="small" icon={<RightOutlined />} onClick={() => setAttMonth((m) => m.add(1, "month"))} />
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Present",    count: attStats.present,   color: "#22c55e", bg: "rgba(34,197,94,0.07)",    border: "rgba(34,197,94,0.2)" },
              { label: "Absent",     count: attStats.absent,    color: "#ef4444", bg: "rgba(239,68,68,0.07)",    border: "rgba(239,68,68,0.2)" },
              { label: "Half Day",   count: attStats.half,      color: "#f97316", bg: "rgba(249,115,22,0.07)",   border: "rgba(249,115,22,0.2)" },
              { label: "Leave",      count: attStats.leave,     color: "#3b82f6", bg: "rgba(59,130,246,0.07)",   border: "rgba(59,130,246,0.2)" },
              { label: "Off Days",   count: attStats.offs,      color: "#94a3b8", bg: "rgba(148,163,184,0.07)",  border: "rgba(148,163,184,0.2)" },
              { label: "Not Marked", count: attStats.notMarked, color: "#64748b", bg: "rgba(100,116,139,0.07)",  border: "rgba(100,116,139,0.2)" },
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
                <div key={day} style={{ fontSize: 10, fontWeight: 700, color: day === "Fri" ? "#ef4444" : "var(--color-text-secondary)", padding: "2px 0" }}>{day}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {attCells.map((cell, i) => {
                if (cell.empty) return <div key={cell.key} />;
                const { d, isOff, rec } = cell;
                const cellBase = { height: 48, borderRadius: 7, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };
                if (isOff) return (
                  <div key={d} style={{ ...cellBase, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>{d}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, color: "#94a3b8" }}>Off</span>
                  </div>
                );
                const sc = rec?.status ? ATT_C[rec.status] : null;
                const cellDate = `${attMonth.format("YYYY-MM")}-${String(d).padStart(2, "0")}`;
                const isSelected = editDay?.date === cellDate;
                return (
                  <div
                    key={d}
                    title={rec ? `${rec.status.replace("_", " ")}${rec.remarks ? ` — ${rec.remarks}` : ""} · Click to edit` : "Not marked · Click to add"}
                    onClick={() => setEditDay({ date: cellDate, status: rec?.status || "present", remarks: rec?.remarks || "" })}
                    style={{
                      ...cellBase,
                      cursor: "pointer",
                      background: sc ? sc.bg : "transparent",
                      border: isSelected ? "2px solid #7c5cfc" : `1.5px ${sc ? "solid" : "dashed"} ${sc ? sc.border : "var(--color-border)"}`,
                      boxShadow: isSelected ? "0 0 0 3px rgba(124,92,252,0.15)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#7c5cfc" : sc?.color || "var(--color-text-secondary)" }}>{d}</span>
                    {sc && <span style={{ fontSize: 8, fontWeight: 800, color: isSelected ? "#7c5cfc" : sc.color }}>{sc.label}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inline day editor */}
          {editDay && (() => {
            const edMain = getAttMain(editDay.status);
            const edPaid = getAttPaid(editDay.status);
            const edNeedsSub = edMain === "half" || edMain === "leave";
            const edMainColor = EDIT_MAIN.find((s) => s.v === edMain)?.color || "#22c55e";
            return (
              <div style={{ border: "2px solid #7c5cfc", borderRadius: 10, padding: "14px 16px", marginBottom: 14, background: "rgba(124,92,252,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#7c5cfc" }}>
                    {new Date(editDay.date + "T00:00:00").toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <AppButton type="text" size="small" onClick={() => setEditDay(null)} style={{ color: "var(--color-text-secondary)" }}>✕</AppButton>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: edNeedsSub ? 10 : 12 }}>
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
                          flex: 1, height: 38, borderRadius: 8,
                          border: `2px solid ${sel ? s.color : "var(--color-border)"}`,
                          background: sel ? s.color + "22" : "transparent",
                          color: sel ? s.color : "var(--color-text-secondary)",
                          fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {s.label} {s.title}
                      </button>
                    );
                  })}
                </div>
                {edNeedsSub && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: edMainColor, fontWeight: 600 }}>
                      {edMain === "half" ? "Half Day" : "Leave"} type:
                    </span>
                    {[{ v: true, label: "Paid" }, { v: false, label: "Unpaid" }].map(({ v, label }) => (
                      <button
                        key={label}
                        onClick={() => setEditDay((p) => ({ ...p, status: buildAttSt(edMain, v) }))}
                        style={{
                          height: 28, padding: "0 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                          border: `1.5px solid ${edPaid === v ? edMainColor : "var(--color-border)"}`,
                          background: edPaid === v ? edMainColor + "22" : "transparent",
                          color: edPaid === v ? edMainColor : "var(--color-text-secondary)",
                          transition: "all 0.15s",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {edPaid ? "• Salary not deducted" : "• Salary will be deducted"}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    placeholder="Remarks (optional)"
                    value={editDay.remarks}
                    onChange={(e) => setEditDay((p) => ({ ...p, remarks: e.target.value }))}
                    style={{ flex: 1, height: 34, borderRadius: 7, border: "1.5px solid var(--color-border)", padding: "0 10px", fontSize: 12, background: "var(--color-bg)", color: "var(--color-text)", outline: "none" }}
                  />
                  <AppButton
                    type="primary"
                    className="btn-dark"
                    onClick={() => { onEditAttendance(employee.id, editDay.date, editDay.status, editDay.remarks); setEditDay(null); }}
                  >
                    Save
                  </AppButton>
                  <AppButton onClick={() => setEditDay(null)}>Cancel</AppButton>
                </div>
              </div>
            );
          })()}

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
            {Object.entries(ATT_C).map(([k, v]) => (
              <span key={k} style={{ fontSize: 11, fontWeight: 600, color: v.color }}>{v.label} — {k.replace("_", " ")}</span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Dashed = Not Marked</span>
          </div>

          {/* Records table */}
          <Table
            dataSource={[...empAttForMonth].sort((a, b) => new Date(b.date) - new Date(a.date))}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{ emptyText: "No attendance records for this month" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
            columns={[
              { title: "Date",    dataIndex: "date",   key: "date", width: "14%",
                render: (v) => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span> },
              { title: "Day",     key: "day",          width: "10%",
                render: (_, r) => <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{new Date(r.date + "T00:00:00").toLocaleDateString("en-PK", { weekday: "short" })}</span> },
              { title: "Status",  dataIndex: "status", key: "status", width: "16%",
                render: (v) => {
                  const cfg = {
                    present:      { color: "success",    label: "Present"      },
                    absent:       { color: "error",      label: "Absent"       },
                    half_paid:    { color: "warning",    label: "Half Day (P)" },
                    half_unpaid:  { color: "volcano",    label: "Half Day (U)" },
                    leave_paid:   { color: "processing", label: "Leave (P)"    },
                    leave_unpaid: { color: "purple",     label: "Leave (U)"    },
                  }[v] || { color: "default", label: v };
                  return <Tag color={cfg.color} style={{ borderRadius: 5, fontWeight: 600, fontSize: 11 }}>{cfg.label}</Tag>;
                }},
              { title: "Remarks",   dataIndex: "remarks",  key: "rem",
                render: (v) => <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{v || "—"}</span> },
            ]}
          />
        </div>
      ),
    },
    {
      key: "advances",
      label: <span style={{ fontWeight: 600 }}><CreditCardOutlined /> Advances ({empAdvances.length})</span>,
      children: (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <MiniCard label="Outstanding Balance" value={formatCurrency(advanceBalance)}            color="#ef4444" bg="rgba(239,68,68,0.07)"    border="rgba(239,68,68,0.2)" />
            <MiniCard label="Total Given"         value={formatCurrency(totalGiven)}                color="#f97316" bg="rgba(249,115,22,0.07)"   border="rgba(249,115,22,0.2)" />
            <MiniCard label="Total Recovered"     value={formatCurrency(totalGiven - advanceBalance)} color="#22c55e" bg="rgba(34,197,94,0.07)" border="rgba(34,197,94,0.2)" />
          </div>
          <Table
            columns={advColumns}
            dataSource={[...empAdvances].sort((a, b) => new Date(b.date) - new Date(a.date))}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            scroll={{ x: 600 }}
            locale={{ emptyText: "No advance records" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
          />
        </div>
      ),
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
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {employee.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className={styles.name}>{employee.name}</h2>
            <p className={styles.sub}>{employee.designation} &nbsp;·&nbsp; {employee.department} &nbsp;·&nbsp; {employee.empNo}</p>
            <Tag color={employee.status === "active" ? "success" : "default"}
              style={{ borderRadius: 6, fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}>
              {employee.status}
            </Tag>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Overall summary cards */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px 4px" }}>
          <StatCard label="Current Salary"    value={formatCurrency(employee.currentSalary || 0)} color="#7c5cfc" />
          <StatCard label="Pending Salary"    value={formatCurrency(totalPendingSalary)}           color={totalPendingSalary > 0 ? "#ef4444" : "#22c55e"} />
          <StatCard label="Advance Balance"   value={formatCurrency(advanceBalance)}               color={advanceBalance > 0 ? "#f97316" : "#22c55e"} />
          <StatCard label="Salary Records"    value={empSalaryRecords.length}                      color="#3b82f6" />
          <StatCard label="No. of Increments" value={empIncrements.length}                         color="#22c55e" />
        </div>

        <div style={{ padding: "8px 24px 24px" }}>
          <Tabs items={tabItems} />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeDetailModal;
