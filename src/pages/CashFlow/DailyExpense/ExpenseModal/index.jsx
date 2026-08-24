import { Modal } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency, formatDate, downloadPDF } from "@/utils";
import { logoSvgString } from "@/utils/logoSvg";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/common";
import styles from "./styles.module.css";

const ExpenseModal = ({ open, onClose, data, onDeleteItem }) => {
  const { user } = useAuth();
  const companyInfo = getCompanyInfo();
  if (!data) return null;

  const { voucher, expenseName, category, date, paymentMethod, person, paidBy, items, totalAmount } = data;
  const validItems = (items || []).filter((i) => i.detail || i.amount > 0);
  const now = new Date();
  const printDate = now.toLocaleString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const buildPrintHTML = () => {
    const TH = `padding:10px 12px;font-size:11px;font-weight:700;color:#fff;border:1px solid #334155;`;
    const TD = `padding:9px 12px;font-size:12px;color:#1e293b;border:1px solid #e2e8f0;`;

    const rows = validItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="${TD}text-align:center;">${i + 1}</td>
        <td style="${TD}word-break:break-word;">${item.detail}</td>
        <td style="${TD}text-align:center;">${item.qty || 1}</td>
        <td style="${TD}text-align:right;font-weight:700;">${formatCurrency(item.amount || 0)}</td>
      </tr>
    `).join("");

    return `<html><head><title>Expense - ${voucher || expenseName || ""}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;color:#1e293b;background:#fff;font-size:12px;}
        @media print{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      </style>
      </head><body style="padding:24px;">
        <div style="height:6px;background:linear-gradient(90deg,#7c5cfc,#a78bfa);border-radius:3px;margin-bottom:20px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div style="display:flex;gap:14px;align-items:flex-start;">
            ${logoSvgString(50)}
            <div>
              <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px;">${companyInfo.name}</h1>
              <p style="font-size:11px;color:#111827;margin:2px 0;"><strong>Contact:</strong> ${companyInfo.contact} &nbsp;&nbsp;<strong>WhatsApp:</strong> ${companyInfo.whatsapp}</p>
              <p style="font-size:11px;color:#111827;margin:2px 0;"><strong>Email:</strong> ${companyInfo.email}</p>
              <p style="font-size:11px;color:#111827;margin:2px 0;"><strong>Address:</strong> ${companyInfo.address}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="display:inline-block;background:linear-gradient(135deg,#7c5cfc,#a78bfa);color:#fff;font-size:15px;font-weight:800;padding:6px 20px;border-radius:20px;margin-bottom:10px;letter-spacing:0.5px;">EXPENSE VOUCHER</div>
            <p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Voucher #:</strong> ${voucher || "N/A"}</p>
            <p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Printed:</strong> ${printDate}</p>
          </div>
        </div>
        <div style="height:1px;background:linear-gradient(90deg,rgba(124,92,252,0.4),#e2e8f0);margin-bottom:16px;"></div>
        <div style="border-left:4px solid #7c5cfc;background:#faf8ff;border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:18px;">
          <h3 style="font-size:10px;font-weight:700;color:#7c5cfc;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">Expense Details</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;">
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Category:</strong> ${category || "N/A"}</p>
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Date:</strong> ${date ? formatDate(date) : "N/A"}</p>
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Payment Method:</strong> ${paymentMethod || "N/A"}</p>
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Person / Vendor:</strong> ${person || "N/A"}</p>
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Paid By:</strong> ${paidBy || "N/A"}</p>
          </div>
          ${expenseName ? `<p style="font-size:11px;color:#374151;margin:8px 0 0;"><strong>Notes:</strong> ${expenseName}</p>` : ""}
        </div>
        <div style="margin-bottom:18px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:linear-gradient(90deg,#1e293b,#334155);">
                <th style="${TH}text-align:center;width:8%">#</th>
                <th style="${TH}text-align:left;">Detail</th>
                <th style="${TH}text-align:center;width:12%">Qty</th>
                <th style="${TH}text-align:right;width:22%">Amount</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;border:1px solid #e2e8f0;">No items</td></tr>`}</tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
          <div style="width:240px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
            <div style="display:flex;justify-content:space-between;padding:11px 14px;background:#1e293b;">
              <span style="color:#e2e8f0;font-weight:700;font-size:13px;">Total Amount</span>
              <span style="font-weight:800;color:#fff;font-size:13px;">${formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
        <div style="background:linear-gradient(135deg,#7c5cfc,#a78bfa);border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center;">
          <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 3px;">Thank you!</p>
          <p style="color:rgba(255,255,255,0.85);font-size:11px;margin:0;">${companyInfo.name} &bull; ${companyInfo.contact}</p>
        </div>
        <div style="border-top:2px solid rgba(124,92,252,0.2);padding-top:12px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#64748b;">
          <div>
            <p style="margin:2px 0;color:#374151;"><strong>Generated:</strong> ${printDate} &nbsp; <strong>By:</strong> ${user?.name || user?.username}</p>
            <p style="margin:2px 0;">Computer generated voucher.</p>
          </div>
          <div style="text-align:center;">
            <div style="width:150px;border-bottom:1px solid #94a3b8;margin-bottom:5px;"></div>
            <span style="color:#374151;">Authorized Signature</span>
          </div>
        </div>
        <div style="height:4px;background:linear-gradient(90deg,#7c5cfc,#a78bfa);border-radius:2px;margin-top:14px;"></div>
      </body></html>`;
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(buildPrintHTML());
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width="90%" style={{ maxWidth: 800, top: 20 }} closable={false} destroyOnClose className={styles.modal}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Expense Preview</h2>
        <div className={styles.headerActions}>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
          <button className={styles.pdfBtn} onClick={() => downloadPDF(buildPrintHTML(), voucher || "expense")}>Download PDF</button>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.page}>
          <div className={styles.companyHeader}>
            <div className={styles.companyLeft}>
              <CompanyLogo size={50} />
              <div>
                <h1 className={styles.companyName}>{companyInfo.name}</h1>
                <p className={styles.detail}><strong>Contact:</strong> {companyInfo.contact} &nbsp;&nbsp;<strong>WhatsApp:</strong> {companyInfo.whatsapp}</p>
                <p className={styles.detail}><strong>Email:</strong> {companyInfo.email}</p>
                <p className={styles.detail}><strong>Address:</strong> {companyInfo.address}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 className={styles.voucherLabel}>EXPENSE VOUCHER</h2>
              <p className={styles.detail}><strong>Voucher #:</strong> {voucher || "N/A"}</p>
              <p className={styles.detail}><strong>Printed:</strong> {printDate}</p>
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg,rgba(124,92,252,0.4),#e2e8f0)", margin: "0 0 16px 0" }} />

          <div className={styles.infoBox}>
            <p className={styles.infoBoxTitle}>Expense Details</p>
            <div className={styles.infoGrid}>
              <p className={styles.detail}><strong>Category:</strong> {category || "N/A"}</p>
              <p className={styles.detail}><strong>Date:</strong> {date ? formatDate(date) : "N/A"}</p>
              <p className={styles.detail}><strong>Payment Method:</strong> {paymentMethod || "N/A"}</p>
              <p className={styles.detail}><strong>Person / Vendor:</strong> {person || "N/A"}</p>
              <p className={styles.detail}><strong>Paid By:</strong> {paidBy || "N/A"}</p>
            </div>
            {expenseName && (
              <p className={styles.detail} style={{ marginTop: 8 }}><strong>Notes:</strong> {expenseName}</p>
            )}
          </div>

          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHead}>
                <th className={styles.thCenter} style={{ width: "8%" }}>#</th>
                <th className={styles.th}>Detail</th>
                <th className={styles.thCenter} style={{ width: "12%" }}>Qty</th>
                <th className={styles.thRight} style={{ width: "20%" }}>Amount</th>
                {onDeleteItem && <th className={styles.thCenter} style={{ width: "10%" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {validItems.length > 0 ? validItems.map((item, i) => (
                <tr key={i}>
                  <td className={styles.tdCenter}>{i + 1}</td>
                  <td className={styles.td}>{item.detail}</td>
                  <td className={styles.tdCenter}>{item.qty || 1}</td>
                  <td className={`${styles.tdRight} ${styles.bold}`}>{formatCurrency(item.amount || 0)}</td>
                  {onDeleteItem && (
                    <td className={styles.tdCenter}>
                      <button className={styles.deleteBtn} onClick={() => onDeleteItem(i)}><DeleteOutlined /></button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={onDeleteItem ? 5 : 4} className={styles.emptyRow}>No items added yet</td></tr>
              )}
            </tbody>
          </table>

          <div className={styles.totalRow}>
            <div className={styles.totalBox}>
              <span className={styles.totalLabel}>Total Amount</span>
              <span className={styles.totalValue}>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className={styles.footer}>
            <p><strong>Generated By:</strong> {user?.name || user?.username}</p>
            <p>Computer generated voucher.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExpenseModal;
