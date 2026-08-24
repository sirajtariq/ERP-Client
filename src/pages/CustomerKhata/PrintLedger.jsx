import { useRef, useState } from "react";
import { Modal, message } from "antd";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency, downloadPDF } from "@/utils";
import { logoSvgString } from "@/utils/logoSvg";
import { useAuth } from "@/context/AuthContext";
import { SignaturePad, CompanyLogo } from "@/components/common";
import styles from "./print.module.css";

const PrintLedger = ({ open, onClose, customer }) => {
  const printRef = useRef();
  const { user } = useAuth();
  const [signature, setSignature] = useState(null);
  const companyInfo = getCompanyInfo();

  if (!customer) return null;

  const summary = customer.summary || {};
  const finalPaymentDetails = customer.finalPaymentDetails || {};
  const transactions = customer.ledger || customer.transactions || [];
  const now = new Date();
  const printDate = now.toLocaleString("en-PK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(buildPrintHTML());
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleDownloadPDF = () => {
    downloadPDF(buildPrintHTML(), `ledger-${customer.name || "customer"}`);
  };

  const buildPrintHTML = () => {
    const s = summary;
    const rows = transactions.map(t => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;white-space:nowrap;">${t.date}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;font-weight:600;word-break:break-all;">${t.voucher}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;word-break:break-word;">${t.description}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;white-space:nowrap;">${t.debit ? formatCurrency(t.debit) : '-'}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;white-space:nowrap;">${t.credit ? formatCurrency(t.credit) : '-'}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;font-weight:700;white-space:nowrap;color:${(t.credit > 0 && !t.debit) ? '#22c55e' : '#1e293b'};">${formatCurrency(t.balance)}</td>
      </tr>
    `).join('');

    const summaryCell = (label, value, color) => `
      <div style="padding:12px 14px;border-bottom:1px solid #f1f5f9;border-right:1px solid #f1f5f9;">
        <div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.3px;">${label}</div>
        <div style="font-size:13px;font-weight:700;color:${color || '#1e293b'};">${value}</div>
      </div>
    `;

    return `
      <html>
      <head>
        <title>Customer Ledger - ${customer.name}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; color: #1e293b; padding: 28px; font-size: 12px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <!-- Company Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;">
          <div style="display:flex;gap:14px;align-items:flex-start;">
            ${logoSvgString(50)}
            <div>
              <h1 style="font-size:20px;font-weight:800;margin:0 0 4px;">${companyInfo.name}</h1>
              <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Contact:</strong> ${companyInfo.contact} &nbsp;&nbsp;<strong>WhatsApp:</strong> ${companyInfo.whatsapp}</p>
              <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Email:</strong> ${companyInfo.email}</p>
              <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Address:</strong> ${companyInfo.address}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <h2 style="font-size:18px;font-weight:800;color:#141423;margin:0 0 6px;">CUSTOMER LEDGER</h2>
            <p style="font-size:12px;color:#475569;">Period: All transactions</p>
            <p style="font-size:12px;color:#475569;"><strong>Printed:</strong> ${printDate}</p>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #d1d5db;margin:0 0 16px 0;" />

        <!-- Customer + Summary -->
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;border:1px solid #3b82f6;border-radius:6px;padding:16px;">
            <h3 style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;margin:0 0 10px;">CUSTOMER DETAILS</h3>
            <h4 style="font-size:16px;font-weight:700;margin:0 0 8px;">${customer.name}</h4>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Customer #:</strong> ${customer.invoiceNo}</p>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Phone:</strong> ${customer.phone}</p>
            ${customer.customerType ? `<p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Type:</strong> <span style="text-transform:capitalize;">${customer.customerType}</span></p>` : ''}
            ${customer.address ? `<p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Address:</strong> ${customer.address}</p>` : ''}
          </div>
          <div style="flex:1.5;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <div style="background:#f1f5f9;color:#1e293b;padding:8px 16px;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #334155;">ACCOUNT SUMMARY</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:0;">
              ${summaryCell('Opening Balance', formatCurrency(finalPaymentDetails.openingBalance), '#8b5cf6')}
              ${summaryCell('Credit Sales', formatCurrency(s.creditSales), '#3b82f6')}
              ${summaryCell('Total Purchases', formatCurrency(finalPaymentDetails.totalPurchases), '#3b82f6')}
              ${summaryCell('Cash Returns', formatCurrency(s.cashReturn), '#22c55e')}
              ${summaryCell('Advance Applied', formatCurrency(s.advanceApplied), '#22c55e')}
              ${summaryCell('Payments Received', formatCurrency(finalPaymentDetails.paymentsReceived), '#22c55e')}
              ${summaryCell('Total Collected', formatCurrency(finalPaymentDetails.totalCollected), '#1e293b')}
              ${summaryCell('Available Advance', formatCurrency(s.availableAdvance), '#22c55e')}
              ${summaryCell('Remaining Balance', formatCurrency(s.remainingBalance), '#ef4444')}
              <div style="padding:12px 14px;grid-column:1/-1;background:#f0f9ff;border-top:1px solid #bae6fd;">
                <div style="font-size:10px;font-weight:600;color:#0369a1;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.3px;">Closing Balance</div>
                <div style="font-size:15px;font-weight:800;color:#0ea5e9;">${formatCurrency(s.closingBalance)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Ledger Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:left;border:1px solid #d1d5db;">Date</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:left;border:1px solid #d1d5db;">Voucher</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:left;border:1px solid #d1d5db;">Description</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:left;border:1px solid #d1d5db;">Debit</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:left;border:1px solid #d1d5db;">Credit</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:left;border:1px solid #d1d5db;">Balance</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <!-- Generated Info -->
        <div style="border:1px solid #e2e8f0;border-radius:4px;padding:12px 16px;margin:20px 0;font-size:12px;color:#475569;line-height:1.7;">
          <p><strong>Generated:</strong> ${printDate}</p>
          <p><strong>Statement Type:</strong> Customer Ledger</p>
          <p><strong>Generated By:</strong> ${user?.name}</p>
          <p>Computer generated statement.</p>
        </div>

        <!-- Signature -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          <span>Computer generated customer ledger.</span>
          <div style="text-align:center;">
            ${signature ? `<img src="${signature}" style="width:160px;height:60px;object-fit:contain;margin-bottom:4px;" />` : `<div style="width:160px;height:60px;margin-bottom:4px;"></div>`}
            <div style="width:160px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div>
            <span>Customer Signature</span>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ maxWidth: 1000, top: 20 }}
      closable={false}
      destroyOnClose
      className={styles.printModal}
    >
      {/* Sticky Header */}
      <section className={styles.header}>
        <h2 className={styles.headerTitle}>
          Customer Ledger - {customer.name} Preview
        </h2>
        <section className={styles.headerActions}>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
          <button className={styles.pdfBtn} onClick={handleDownloadPDF}>Download PDF</button>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </section>
      </section>

      {/* Printable Content */}
      <section className={styles.scrollArea}>
        <section className={styles.printPage} ref={printRef}>

          {/* Company Header */}
          <section className={styles.companyHeader}>
            <section className={styles.companyLeft}>
              <CompanyLogo size={50} />
              <section>
                <h1 className={styles.companyName}>{companyInfo.name}</h1>
                <p className={styles.companyDetail}>
                  <strong>Contact:</strong> {companyInfo.contact} &nbsp;&nbsp;
                  <strong>WhatsApp:</strong> {companyInfo.whatsapp}
                </p>
                <p className={styles.companyDetail}>
                  <strong>Email:</strong> {companyInfo.email}
                </p>
                <p className={styles.companyDetail}>
                  <strong>Address:</strong> {companyInfo.address}
                </p>
              </section>
            </section>
            <section className={styles.companyRight}>
              <h2 className={styles.ledgerLabel}>CUSTOMER LEDGER</h2>
              <p className={styles.periodText}><strong>Period:</strong> All transactions</p>
              <p className={styles.periodText}><strong>Printed:</strong> {printDate}</p>
            </section>
          </section>
          <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0 0 16px 0" }} />

          {/* Customer Details + Account Summary */}
          <section className={styles.detailsRow}>
            <section className={styles.customerBox}>
              <h3 className={styles.boxTitle}>CUSTOMER DETAILS</h3>
              <h4 className={styles.customerName}>{customer.name}</h4>
              <p className={styles.detailLine}><strong>Customer #:</strong> {customer.invoiceNo}</p>
              <p className={styles.detailLine}><strong>Phone:</strong> {customer.phone}</p>
              {customer.customerType && (
                <p className={styles.detailLine}><strong>Type:</strong> <span style={{ textTransform: "capitalize" }}>{customer.customerType}</span></p>
              )}
              {customer.address && (
                <p className={styles.detailLine}><strong>Address:</strong> {customer.address}</p>
              )}
            </section>
            <section className={styles.summaryBox}>
              <h3 className={styles.boxTitleDark}>ACCOUNT SUMMARY</h3>
              <section className={styles.summaryGrid}>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Opening Balance</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6" }}>{formatCurrency(finalPaymentDetails.openingBalance)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Credit Sales</span>
                  <span className={styles.summaryValueBlue}>{formatCurrency(summary.creditSales)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Total Purchases</span>
                  <span className={styles.summaryValueBlue}>{formatCurrency(finalPaymentDetails.totalPurchases)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Cash Returns</span>
                  <span className={styles.summaryValueGreen}>{formatCurrency(summary.cashReturn)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Advance Applied</span>
                  <span className={styles.summaryValueGreen}>{formatCurrency(summary.advanceApplied)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Payments Received</span>
                  <span className={styles.summaryValueGreen}>{formatCurrency(finalPaymentDetails.paymentsReceived)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Total Collected</span>
                  <span className={styles.summaryValue}>{formatCurrency(finalPaymentDetails.totalCollected)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Available Advance</span>
                  <span className={styles.summaryValueGreen}>{formatCurrency(summary.availableAdvance)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Remaining Balance</span>
                  <span className={styles.summaryValueRed}>{formatCurrency(summary.remainingBalance)}</span>
                </section>
                <section style={{ gridColumn: "1 / -1", padding: "10px 14px", background: "#f0f9ff", borderTop: "1px solid #bae6fd" }}>
                  <span className={styles.summaryLabel} style={{ color: "#0369a1" }}>Closing Balance</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#0ea5e9", display: "block", marginTop: 4 }}>{formatCurrency(summary.closingBalance)}</span>
                </section>
              </section>
            </section>
          </section>

          {/* Ledger Table */}
          <table className={styles.ledgerTable}>
            <thead>
              <tr className={styles.tableHead}>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Voucher</th>
                <th className={styles.th}>Description</th>
                <th className={styles.th}>Debit</th>
                <th className={styles.th}>Credit</th>
                <th className={styles.th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className={styles.tableRow}>
                  <td className={styles.td}>{t.date}</td>
                  <td className={styles.td}>{t.voucher}</td>
                  <td className={styles.td}>{t.description}</td>
                  <td className={styles.td}>{t.debit ? formatCurrency(t.debit) : "-"}</td>
                  <td className={styles.td}>{t.credit ? formatCurrency(t.credit) : "-"}</td>
                  <td className={`${styles.td} ${styles.balanceCell} ${t.type === "Cr" ? styles.balanceCr : styles.balanceDr}`}>
                    {formatCurrency(t.balance)} {t.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Generated Info */}
          <section className={styles.generatedBox}>
            <p><strong>Generated:</strong> {printDate}</p>
            <p><strong>Statement Type:</strong> Customer Ledger</p>
            <p><strong>Generated By:</strong> {user?.name}</p>
            <p>Computer generated statement.</p>
          </section>

          {/* Signature Preview */}
          <section className={styles.signatureRow}>
            <span>Computer generated customer ledger.</span>
            <section className={styles.signatureBlock}>
              {signature && <img src={signature} className={styles.signatureImg} alt="Signature" />}
              <span className={styles.signatureLine} />
              <span>Customer Signature</span>
            </section>
          </section>
        </section>

        {/* Signature Pad - outside print area */}
        <section className={styles.signaturePadSection}>
          <SignaturePad
            onSave={(data) => {
              setSignature(data);
              message.success("Signature saved");
            }}
            onClear={() => setSignature(null)}
            savedSignature={signature}
          />
        </section>
      </section>
    </Modal>
  );
};

export default PrintLedger;
