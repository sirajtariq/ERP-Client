import { Modal } from "antd";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency } from "@/utils";
import { logoSvgString } from "@/utils/logoSvg";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/common";
import styles from "./styles.module.css";

const ReceiveModal = ({ open, onClose, data }) => {
  const { user } = useAuth();
  const companyInfo = getCompanyInfo();
  if (!data) return null;

  const {
    receiptNo, date, customerName, amount, method, notes, invoiceNo,
    balanceAfter, appliedToInvoice, appliedToCredit, appliedToAdvance,
  } = data;
  const now = new Date();
  const printDate = now.toLocaleString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Receipt - ${customerName}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:12px}</style>
      </head><body>
        <div style="background:linear-gradient(135deg,#0f0c29 0%,#141423 45%,#1e1b4b 100%);padding:20px 28px;margin:-28px -28px 24px -28px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #7c5cfc;">
          <div style="display:flex;gap:14px;align-items:center;">
            <div style="background:#fff;border-radius:10px;padding:6px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${logoSvgString(42)}</div>
            <div>
              <h1 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 4px;white-space:nowrap;">${companyInfo.name}</h1>
              <p style="font-size:11px;color:rgba(255,255,255,0.75);margin:1px 0;">${companyInfo.contact} &nbsp;•&nbsp; ${companyInfo.email}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="display:inline-block;background:rgba(124,92,252,0.2);border:1.5px solid rgba(124,92,252,0.45);border-radius:10px;padding:10px 18px;">
              <h2 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 5px;text-transform:uppercase;letter-spacing:1.5px;">PAYMENT RECEIPT</h2>
              ${receiptNo ? `<p style="font-size:11px;color:rgba(255,255,255,0.8);margin:1px 0;"><span style="color:rgba(255,255,255,0.55);">Receipt No:</span> ${receiptNo}</p>` : ""}
              <p style="font-size:11px;color:rgba(255,255,255,0.8);margin:1px 0;"><span style="color:rgba(255,255,255,0.55);">Date:</span> ${date || "N/A"}</p>
              <p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0;"><span style="color:rgba(255,255,255,0.45);">Printed:</span> ${printDate}</p>
            </div>
          </div>
        </div>
        <div style="border:1px solid #3b82f6;border-radius:6px;padding:20px;margin-bottom:20px;">
          <p style="font-size:14px;margin:6px 0;"><strong>Received From:</strong> ${customerName}</p>
          ${invoiceNo ? `<p style="font-size:14px;margin:6px 0;"><strong>Invoice Number:</strong> ${invoiceNo}</p>` : ""}
          <p style="font-size:14px;margin:6px 0;"><strong>Amount Received:</strong> <span style="font-size:20px;font-weight:800;color:#22c55e;">${formatCurrency(amount)}</span></p>
          <p style="font-size:14px;margin:6px 0;"><strong>Method:</strong> ${method}</p>
          ${notes ? `<p style="font-size:14px;margin:6px 0;"><strong>Notes:</strong> ${notes}</p>` : ""}
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:6px;padding:20px;margin-bottom:20px;">
          <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin:0 0 10px;">Payment Allocation</h3>
          ${appliedToInvoice > 0 ? `<p style="font-size:13px;margin:4px 0;display:flex;justify-content:space-between;"><span>Applied to Invoice</span><span style="font-weight:700;">${formatCurrency(appliedToInvoice)}</span></p>` : ""}
          ${appliedToCredit > 0 ? `<p style="font-size:13px;margin:4px 0;display:flex;justify-content:space-between;"><span>Applied to Credit</span><span style="font-weight:700;">${formatCurrency(appliedToCredit)}</span></p>` : ""}
          ${appliedToAdvance > 0 ? `<p style="font-size:13px;margin:4px 0;display:flex;justify-content:space-between;"><span>Applied to Advance</span><span style="font-weight:700;">${formatCurrency(appliedToAdvance)}</span></p>` : ""}
          <p style="font-size:13px;margin:8px 0 0;padding-top:8px;border-top:1px dashed #e2e8f0;display:flex;justify-content:space-between;"><span style="font-weight:700;">Balance After</span><span style="font-weight:800;">${formatCurrency(balanceAfter)}</span></p>
        </div>
        <div style="margin-top:30px;font-size:12px;color:#64748b;"><p><strong>Received By:</strong> ${user?.name || user?.username}</p><p>Computer generated receipt.</p></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          <span>Computer generated receipt.</span>
          <div style="text-align:center;"><div style="width:160px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div><span>Authorized Signature</span></div>
        </div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={600} style={{ top: 40 }} closable={false} destroyOnClose className={styles.modal}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Receipt Preview</h2>
        <div className={styles.headerActions}>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
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
                <p className={styles.detail}>{companyInfo.contact} | {companyInfo.email}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 className={styles.receiptLabel}>PAYMENT RECEIPT</h2>
              {receiptNo && <p className={styles.detail}><strong>Receipt No:</strong> {receiptNo}</p>}
              <p className={styles.detail}><strong>Date:</strong> {date || "N/A"}</p>
              <p className={styles.detail}><strong>Printed:</strong> {printDate}</p>
            </div>
          </div>

          <div className={styles.receiptBox}>
            <div className={styles.receiptRow}>
              <span className={styles.receiptKey}>Received From</span>
              <span className={styles.receiptValue}>{customerName}</span>
            </div>
            {invoiceNo && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Invoice Number</span>
                <span className={styles.receiptValue}>{invoiceNo}</span>
              </div>
            )}
            <div className={styles.receiptRow}>
              <span className={styles.receiptKey}>Amount Received</span>
              <span className={styles.receiptAmount}>{formatCurrency(amount)}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptKey}>Method</span>
              <span className={styles.receiptValue}>{method}</span>
            </div>
            {notes && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Notes</span>
                <span className={styles.receiptValue}>{notes}</span>
              </div>
            )}
          </div>

          <div className={styles.receiptBox}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)", margin: "0 0 10px" }}>
              Payment Allocation
            </h3>
            {appliedToInvoice > 0 && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Applied to Invoice</span>
                <span className={styles.receiptValue}>{formatCurrency(appliedToInvoice)}</span>
              </div>
            )}
            {appliedToCredit > 0 && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Applied to Credit</span>
                <span className={styles.receiptValue}>{formatCurrency(appliedToCredit)}</span>
              </div>
            )}
            {appliedToAdvance > 0 && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Applied to Advance</span>
                <span className={styles.receiptValue}>{formatCurrency(appliedToAdvance)}</span>
              </div>
            )}
            <div className={styles.receiptRow}>
              <span className={styles.receiptKey} style={{ fontWeight: 700 }}>Balance After</span>
              <span className={styles.receiptAmount}>{formatCurrency(balanceAfter)}</span>
            </div>
          </div>

          <div className={styles.footer}>
            <p><strong>Received By:</strong> {user?.name || user?.username}</p>
            <p>Computer generated receipt.</p>
          </div>

          <div className={styles.sigRow}>
            <span>Computer generated receipt.</span>
            <div className={styles.sigBlock}><div className={styles.sigLine} /><span>Authorized Signature</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiveModal;
