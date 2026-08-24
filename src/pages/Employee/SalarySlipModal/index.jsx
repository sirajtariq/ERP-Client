import { useRef } from "react";
import { Modal } from "antd";
import { formatCurrency, downloadPDF } from "@/utils";
import { logoSvgString } from "@/utils/logoSvg";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import styles from "./styles.module.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS = { paid: "#22c55e", partial: "#f97316", pending: "#ef4444" };

const SalarySlipModal = ({ open, onClose, data }) => {
  const iframeRef = useRef(null);

  if (!data) return null;

  const company    = data.company    || {};
  const employee   = data.employee   || {};
  const payslip    = data.payslip    || {};
  const attendance = data.attendance || {};
  const earnings   = data.earnings   || {};
  const deductions = data.deductions || {};
  const summary    = data.summary    || {};
  const payments   = data.payments   || [];

  const monthName = `${MONTHS[(payslip.month || 1) - 1]} ${payslip.year || ""}`;
  const statusColor = STATUS_COLORS[payslip.status] || "#64748b";
  const printDate = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" });

  const buildPrintHTML = () => {
    const fc = (n) => formatCurrency(n || 0);
    const companyInfo = getCompanyInfo();
    const phone    = company.phone || companyInfo.contact  || "";
    const whatsapp = companyInfo.whatsapp || "";

    const earnRow = (label, val, color) => `
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">${label}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;text-align:right;color:${color || "#1e293b"};">${fc(val)}</td>
      </tr>`;

    const dedRow = (label, val) => Number(val) > 0 ? `
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">${label}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;text-align:right;color:#ef4444;">- ${fc(val)}</td>
      </tr>` : "";

    const attRow = (label, val, color) => `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;border-right:1px solid #e2e8f0;min-width:0;flex:1;">
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px;text-align:center;">${label}</div>
        <div style="font-size:22px;font-weight:800;color:${color};">${val}</div>
      </div>`;

    const paymentRows = payments.map((p) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${p.paymentDate || "—"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;font-weight:700;">${fc(p.amount)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${p.paymentMethod || "—"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;color:#475569;">${p.paidBy || "—"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;color:#475569;">${p.remarks || "—"}</td>
      </tr>`).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Salary Slip — ${employee.name || ""} — ${monthName}</title>
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

  <!-- Purple gradient top bar -->
  <div style="height:6px;background:linear-gradient(90deg,#7c5cfc,#a78bfa);"></div>

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:20px 28px;">
    <div style="display:flex;gap:14px;align-items:flex-start;">
      ${logoSvgString(46)}
      <div>
        <h1 style="font-size:20px;font-weight:800;margin:0 0 4px;">${company.name || "Company Name"}</h1>
        ${company.address ? `<p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Address:</strong> ${company.address}</p>` : ""}
        ${phone ? `<p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Tel:</strong> ${phone}${whatsapp ? `&nbsp;&nbsp;<strong>WhatsApp:</strong> ${whatsapp}` : ""}</p>` : ""}
        ${company.email ? `<p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Email:</strong> ${company.email}</p>` : ""}
      </div>
    </div>
    <div style="text-align:right;">
      <h2 style="font-size:18px;font-weight:800;color:#141423;margin:0 0 6px;">SALARY SLIP</h2>
      <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Month:</strong> ${monthName}</p>
      <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Slip No:</strong> ${payslip.slipNo || "—"}</p>
      <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Issue Date:</strong> ${payslip.issueDate || "—"}</p>
      <p style="font-size:12px;color:#475569;margin:2px 0;">
        <strong>Status:</strong>
        <span style="font-weight:700;color:${statusColor};text-transform:capitalize;">${payslip.status || "—"}</span>
      </p>
    </div>
  </div>
  <hr style="border:none;border-top:1px solid #d1d5db;margin:0;" />

  <!-- EMPLOYEE DETAILS -->
  <div class="section-title">Employee Information</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #e2e8f0;">
    <div style="padding:10px 20px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Employee Name</div>
      <div style="font-size:14px;font-weight:700;">${employee.name || "—"}</div>
    </div>
    <div style="padding:10px 20px;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Employee No.</div>
      <div style="font-size:14px;font-weight:700;">${employee.empId || "—"}</div>
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
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">CNIC</div>
      <div style="font-size:13px;font-weight:600;">${employee.cnic || "—"}</div>
    </div>
    <div style="padding:10px 20px;">
      <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Phone</div>
      <div style="font-size:13px;font-weight:600;">${employee.phone || "—"}</div>
    </div>
  </div>

  <!-- ATTENDANCE SUMMARY -->
  <div class="section-title">Attendance Summary — ${monthName} (Working Days: ${attendance.workingDays ?? "—"} | Month Days: ${attendance.monthDays ?? "—"})</div>
  <div style="display:flex;border-bottom:1px solid #e2e8f0;">
    ${attRow("Present",     attendance.presentDays ?? 0, "#22c55e")}
    ${attRow("Absent",      attendance.absentDays  ?? 0, "#ef4444")}
    ${attRow("Half Day",    attendance.halfDays    ?? 0, "#f97316")}
    ${attRow("Weekly Offs", attendance.weeklyOffs   ?? 0, "#94a3b8")}
  </div>

  <!-- EARNINGS & DEDUCTIONS -->
  <div class="section-title">Earnings &amp; Deductions</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:2px solid #e2e8f0;">
    <div style="border-right:2px solid #e2e8f0;">
      <div style="padding:8px 14px;background:rgba(34,197,94,0.05);border-bottom:1px solid rgba(34,197,94,0.15);">
        <span style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.3px;">Earnings</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${earnRow("Basic Salary", earnings.basicSalary, "#1e293b")}
        ${earnings.currentSalary !== earnings.basicSalary ? earnRow("Current Salary", earnings.currentSalary, "#1e293b") : ""}
        ${Number(earnings.bonus) > 0 ? earnRow("Bonus / Incentive", earnings.bonus, "#22c55e") : ""}
      </table>
      <div style="padding:10px 14px;background:rgba(34,197,94,0.05);border-top:1px solid rgba(34,197,94,0.15);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;">Total Earnings</span>
        <span style="font-size:15px;font-weight:800;color:#16a34a;">${fc(earnings.totalEarnings)}</span>
      </div>
    </div>
    <div>
      <div style="padding:8px 14px;background:rgba(239,68,68,0.05);border-bottom:1px solid rgba(239,68,68,0.15);">
        <span style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.3px;">Deductions</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${dedRow("Attendance Deduction", deductions.attendanceDeduction)}
        ${dedRow("Advance Deduction",    deductions.advanceDeduction)}
        ${dedRow("Other Deductions",     deductions.otherDeductions)}
        ${Number(deductions.totalDeductions) === 0 ? `<tr><td colspan="2" style="padding:8px 14px;font-size:12px;color:#94a3b8;font-style:italic;">No deductions this month</td></tr>` : ""}
      </table>
      <div style="padding:10px 14px;background:rgba(239,68,68,0.05);border-top:1px solid rgba(239,68,68,0.15);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;">Total Deductions</span>
        <span style="font-size:15px;font-weight:800;color:#dc2626;">${fc(deductions.totalDeductions)}</span>
      </div>
    </div>
  </div>

  <!-- NET PAY -->
  <div style="background:#fff;padding:18px 28px;border:2px solid #1e293b;border-radius:0;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Net Salary for ${monthName}</div>
        <div style="font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">${fc(summary.netSalary)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Paid Amount</div>
        <div style="font-size:16px;font-weight:700;color:#16a34a;">${fc(summary.paidAmount)}</div>
        ${Number(summary.balanceRemaining) > 0 ? `
        <div style="font-size:11px;color:#64748b;margin-top:6px;margin-bottom:2px;">Balance Remaining</div>
        <div style="font-size:16px;font-weight:700;color:#dc2626;">${fc(summary.balanceRemaining)}</div>` : `
        <div style="margin-top:8px;padding:4px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:20px;font-size:12px;font-weight:700;color:#16a34a;">FULLY PAID</div>`}
      </div>
    </div>
    ${summary.amountInWords ? `
    <div style="margin-top:12px;padding-top:12px;border-top:1px dashed #d1d5db;font-size:12px;color:#475569;">
      <strong>Amount in Words:</strong> ${summary.amountInWords}
    </div>` : ""}
  </div>

  ${payments.length > 0 ? `
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
      <div>Printed: ${printDate}</div>
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

  const html = buildPrintHTML();

  const handlePrint = () => {
    const frame = iframeRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }
  };

  const handleDownload = () => {
    downloadPDF(html, payslip.slipNo || "salary-slip");
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ maxWidth: 900, top: 20 }}
      closable={false}
      destroyOnClose
      className={styles.previewModal}
    >
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Salary Slip — {employee.name}</h2>
        <div className={styles.headerActions}>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
          <button className={styles.pdfBtn} onClick={handleDownload}>Download PDF</button>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>

      <div className={styles.scrollArea}>
        <iframe ref={iframeRef} title="Salary Slip" srcDoc={html} className={styles.frame} />
      </div>
    </Modal>
  );
};

export default SalarySlipModal;
