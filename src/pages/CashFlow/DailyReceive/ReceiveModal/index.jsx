import { Modal } from "antd";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency, downloadPDF } from "@/utils";
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

  const buildPrintHTML = () => `<html><head><title>Receipt - ${customerName}</title>
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
          <div style="display:inline-block;background:linear-gradient(135deg,#7c5cfc,#a78bfa);color:#fff;font-size:15px;font-weight:800;padding:6px 20px;border-radius:20px;margin-bottom:10px;letter-spacing:0.5px;">PAYMENT RECEIPT</div>
          ${receiptNo ? `<p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Receipt No:</strong> ${receiptNo}</p>` : ""}
          <p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Date:</strong> ${date || "N/A"}</p>
          <p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Printed:</strong> ${printDate}</p>
        </div>
      </div>
      <div style="height:1px;background:linear-gradient(90deg,rgba(124,92,252,0.4),#e2e8f0);margin-bottom:16px;"></div>
      <div style="border-left:4px solid #7c5cfc;background:#faf8ff;border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:16px;">
        <h3 style="font-size:10px;font-weight:700;color:#7c5cfc;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">Payment Info</h3>
        <p style="font-size:13px;color:#374151;margin:5px 0;"><strong>Received From:</strong> ${customerName}</p>
        ${invoiceNo ? `<p style="font-size:13px;color:#374151;margin:5px 0;"><strong>Invoice Number:</strong> ${invoiceNo}</p>` : ""}
        <p style="font-size:13px;color:#374151;margin:5px 0;"><strong>Amount Received:</strong> <span style="font-size:18px;font-weight:800;color:#15803d;">${formatCurrency(amount)}</span></p>
        <p style="font-size:13px;color:#374151;margin:5px 0;"><strong>Method:</strong> ${method}</p>
        ${notes ? `<p style="font-size:13px;color:#374151;margin:5px 0;"><strong>Notes:</strong> ${notes}</p>` : ""}
      </div>
      <div style="border-left:4px solid #94a3b8;background:#f8fafc;border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;">
        <h3 style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">Payment Allocation</h3>
        ${appliedToInvoice > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:12px;"><span style="color:#374151;">Applied to Invoice</span><span style="font-weight:700;color:#1e293b;">${formatCurrency(appliedToInvoice)}</span></div>` : ""}
        ${appliedToCredit > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:12px;"><span style="color:#374151;">Applied to Credit</span><span style="font-weight:700;color:#1e293b;">${formatCurrency(appliedToCredit)}</span></div>` : ""}
        ${appliedToAdvance > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:12px;"><span style="color:#374151;">Applied to Advance</span><span style="font-weight:700;color:#1e293b;">${formatCurrency(appliedToAdvance)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:12px;"><span style="font-weight:700;color:#374151;">Balance After</span><span style="font-weight:800;color:#1e293b;">${formatCurrency(balanceAfter)}</span></div>
      </div>
      <div style="background:linear-gradient(135deg,#7c5cfc,#a78bfa);border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center;">
        <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 3px;">Thank you for your payment!</p>
        <p style="color:rgba(255,255,255,0.85);font-size:11px;margin:0;">${companyInfo.name} &bull; ${companyInfo.contact}</p>
      </div>
      <div style="border-top:2px solid rgba(124,92,252,0.2);padding-top:12px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#64748b;">
        <div>
          <p style="margin:2px 0;color:#374151;"><strong>Received By:</strong> ${user?.name || user?.username}</p>
          <p style="margin:2px 0;">Computer generated receipt.</p>
        </div>
        <div style="text-align:center;">
          <div style="width:150px;border-bottom:1px solid #94a3b8;margin-bottom:5px;"></div>
          <span style="color:#374151;">Authorized Signature</span>
        </div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#7c5cfc,#a78bfa);border-radius:2px;margin-top:14px;"></div>
    </body></html>`;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(buildPrintHTML());
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={600} style={{ top: 40 }} closable={false} destroyOnClose className={styles.modal}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Receipt Preview</h2>
        <div className={styles.headerActions}>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
          <button className={styles.pdfBtn} onClick={() => downloadPDF(buildPrintHTML(), receiptNo || "receipt")}>Download PDF</button>
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
          <div style={{ height: 1, background: "linear-gradient(90deg,rgba(124,92,252,0.4),#e2e8f0)", margin: "0 0 16px 0" }} />

          <div className={styles.receiptBox}>
            <p className={styles.receiptBoxTitle}>Payment Info</p>
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

          <div className={styles.receiptBoxAlt}>
            <p className={styles.receiptBoxTitleAlt}>Payment Allocation</p>
            {appliedToInvoice > 0 && (
              <div className={styles.receiptRowAlt}>
                <span className={styles.receiptKey}>Applied to Invoice</span>
                <span className={styles.receiptValue}>{formatCurrency(appliedToInvoice)}</span>
              </div>
            )}
            {appliedToCredit > 0 && (
              <div className={styles.receiptRowAlt}>
                <span className={styles.receiptKey}>Applied to Credit</span>
                <span className={styles.receiptValue}>{formatCurrency(appliedToCredit)}</span>
              </div>
            )}
            {appliedToAdvance > 0 && (
              <div className={styles.receiptRowAlt}>
                <span className={styles.receiptKey}>Applied to Advance</span>
                <span className={styles.receiptValue}>{formatCurrency(appliedToAdvance)}</span>
              </div>
            )}
            <div className={styles.receiptRowAlt}>
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
