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

  const { customerName, amount, method, notes, invoiceNo } = data;
  const now = new Date();
  const printDate = now.toLocaleString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Receipt - ${customerName}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:12px}</style>
      </head><body>
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #141423;">
          <div style="display:flex;gap:14px;align-items:flex-start;">${logoSvgString(50)}<div><h1 style="font-size:20px;font-weight:800;">${companyInfo.name}</h1><p style="font-size:12px;color:#475569;">${companyInfo.contact} | ${companyInfo.email}</p></div></div>
          <div style="text-align:right;"><h2 style="font-size:18px;font-weight:800;">PAYMENT RECEIPT</h2><p style="font-size:12px;color:#475569;"><strong>Date:</strong> ${printDate}</p></div>
        </div>
        <div style="border:1px solid #3b82f6;border-radius:6px;padding:20px;margin-bottom:20px;">
          <p style="font-size:14px;margin:6px 0;"><strong>Received From:</strong> ${customerName}</p>
          ${invoiceNo ? `<p style="font-size:14px;margin:6px 0;"><strong>Invoice Number:</strong> ${invoiceNo}</p>` : ""}
          <p style="font-size:14px;margin:6px 0;"><strong>Amount Received:</strong> <span style="font-size:20px;font-weight:800;color:#22c55e;">${formatCurrency(amount)}</span></p>
          <p style="font-size:14px;margin:6px 0;"><strong>Method:</strong> ${method}</p>
          ${notes ? `<p style="font-size:14px;margin:6px 0;"><strong>Notes:</strong> ${notes}</p>` : ""}
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
              <p className={styles.detail}><strong>Date:</strong> {printDate}</p>
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
