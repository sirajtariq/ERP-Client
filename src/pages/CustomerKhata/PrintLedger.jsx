import { useRef, useState } from "react";
import { Modal, message } from "antd";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency } from "@/utils";
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
  const transactions = customer.transactions || [];
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
    handlePrint();
  };

  const buildPrintHTML = () => {
    const s = summary;
    const rows = transactions.map(t => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${t.date}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;font-weight:600;">${t.voucher}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${t.description}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;">${t.debit ? formatCurrency(t.debit) : '-'}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;">${t.credit ? formatCurrency(t.credit) : '-'}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;font-weight:700;color:${t.type === 'Cr' ? '#22c55e' : '#1e293b'};">${formatCurrency(t.balance)} ${t.type}</td>
      </tr>
    `).join('');

    const summaryCell = (label, value, color) => `
      <div style="padding:8px 10px;border-bottom:1px solid #f1f5f9;border-right:1px solid #f1f5f9;">
        <div style="font-size:11px;font-weight:600;color:#64748b;">${label}</div>
        <div style="font-size:13px;font-weight:700;color:${color || '#1e293b'};">${value}</div>
      </div>
    `;

    const finalCell = (label, value, color) => `
      <div style="flex:1;padding:10px 14px;border-right:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:600;color:#64748b;">${label}</div>
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
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #141423;">
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
            <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Period:</strong> All transactions</p>
            <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Printed:</strong> ${printDate}</p>
          </div>
        </div>

        <!-- Customer + Summary -->
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;border:1px solid #3b82f6;border-radius:6px;padding:16px;">
            <h3 style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;margin:0 0 10px;">CUSTOMER DETAILS</h3>
            <h4 style="font-size:16px;font-weight:700;margin:0 0 8px;">${customer.name}</h4>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Customer #:</strong> ${customer.invoiceNo}</p>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Phone:</strong> ${customer.phone}</p>
            ${customer.address ? `<p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Address:</strong> ${customer.address}</p>` : ''}
          </div>
          <div style="flex:1.5;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <div style="background:#141423;color:#fff;padding:8px 16px;font-size:11px;font-weight:700;text-transform:uppercase;">ACCOUNT SUMMARY</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:0;">
              ${summaryCell('Total Sales', formatCurrency(s.creditSales), '#3b82f6')}
              ${summaryCell('Payments Received', formatCurrency(s.cashReturns), '#22c55e')}
              ${summaryCell('Advance Applied', formatCurrency(s.advanceApplied), '#22c55e')}
              ${summaryCell('Total Collected', formatCurrency(s.totalCollected), '#1e293b')}
              ${summaryCell('Available Advance', formatCurrency(s.availableAdvance), '#22c55e')}
              ${summaryCell('Remaining Balance', formatCurrency(s.remainingBalance), '#ef4444')}
              ${summaryCell('Invoices', s.totalInvoices, '#1e293b')}
              ${summaryCell('Opening', formatCurrency(customer.openingCredit), '#1e293b')}
              ${summaryCell('Formula', '<em>Remaining = Opening + Sales - Cash - Advance</em>', '#64748b')}
            </div>
          </div>
        </div>

        <!-- Statement Note -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:10px 14px;font-size:12px;color:#475569;margin-bottom:16px;">
          This statement shows invoice sales, payments received, advance balance, and remaining khata balance for customer confirmation.
        </div>

        <!-- Ledger Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#141423;">
              <th style="padding:10px 10px;font-size:12px;font-weight:600;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Date</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:600;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Voucher</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:600;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Description</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Debit</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Credit</th>
              <th style="padding:10px 10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Balance</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <!-- Final Payment Details -->
        <h3 style="font-size:14px;font-weight:700;color:#3b82f6;margin:0 0 8px;">Final Payment Details</h3>
        <div style="display:flex;border:1px solid #e2e8f0;">
          ${finalCell('Opening Balance', formatCurrency(customer.openingCredit))}
          ${finalCell('Total Purchases', formatCurrency(s.creditSales), '#3b82f6')}
          ${finalCell('Payments Received', formatCurrency(s.cashReturns), '#22c55e')}
          ${finalCell('Advance Used', formatCurrency(s.advanceApplied), '#22c55e')}
        </div>
        <div style="display:flex;border:1px solid #e2e8f0;border-top:none;">
          ${finalCell('Total Collected', formatCurrency(s.totalCollected))}
          ${finalCell('Available Advance', formatCurrency(s.availableAdvance), '#22c55e')}
          ${finalCell('Remaining Balance', formatCurrency(s.remainingBalance), '#ef4444')}
        </div>

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

          {/* Customer Details + Account Summary */}
          <section className={styles.detailsRow}>
            <section className={styles.customerBox}>
              <h3 className={styles.boxTitle}>CUSTOMER DETAILS</h3>
              <h4 className={styles.customerName}>{customer.name}</h4>
              <p className={styles.detailLine}><strong>Customer #:</strong> {customer.invoiceNo}</p>
              <p className={styles.detailLine}><strong>Phone:</strong> {customer.phone}</p>
              {customer.address && (
                <p className={styles.detailLine}><strong>Address:</strong> {customer.address}</p>
              )}
            </section>
            <section className={styles.summaryBox}>
              <h3 className={styles.boxTitleDark}>ACCOUNT SUMMARY</h3>
              <section className={styles.summaryGrid}>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Total Sales</span>
                  <span className={styles.summaryValueBlue}>{formatCurrency(summary.creditSales)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Payments Received</span>
                  <span className={styles.summaryValueGreen}>{formatCurrency(summary.cashReturns)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Advance Applied</span>
                  <span className={styles.summaryValueGreen}>{formatCurrency(summary.advanceApplied)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Total Collected</span>
                  <span className={styles.summaryValue}>{formatCurrency(summary.totalCollected)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Available Advance</span>
                  <span className={styles.summaryValueGreen}>{formatCurrency(summary.availableAdvance)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Remaining Balance</span>
                  <span className={styles.summaryValueRed}>{formatCurrency(summary.remainingBalance)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Invoices</span>
                  <span className={styles.summaryValue}>{summary.totalInvoices}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Opening</span>
                  <span className={styles.summaryValue}>{formatCurrency(customer.openingCredit)}</span>
                </section>
                <section className={styles.summaryCell}>
                  <span className={styles.summaryLabel}>Formula</span>
                  <span className={styles.summaryFormula}>Remaining = Opening + Sales - Cash - Advance</span>
                </section>
              </section>
            </section>
          </section>

          {/* Statement Note */}
          <section className={styles.statementNote}>
            This statement shows invoice sales, payments received, advance balance, and remaining khata balance for customer confirmation.
          </section>

          {/* Ledger Table */}
          <table className={styles.ledgerTable}>
            <thead>
              <tr className={styles.tableHead}>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Voucher</th>
                <th className={styles.th}>Description</th>
                <th className={styles.thRight}>Debit</th>
                <th className={styles.thRight}>Credit</th>
                <th className={styles.thRight}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className={styles.tableRow}>
                  <td className={styles.td}>{t.date}</td>
                  <td className={styles.td}>{t.voucher}</td>
                  <td className={styles.td}>{t.description}</td>
                  <td className={styles.tdRight}>{t.debit ? formatCurrency(t.debit) : "-"}</td>
                  <td className={styles.tdRight}>{t.credit ? formatCurrency(t.credit) : "-"}</td>
                  <td className={`${styles.tdRight} ${styles.balanceCell} ${t.type === "Cr" ? styles.balanceCr : styles.balanceDr}`}>
                    {formatCurrency(t.balance)} {t.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Final Payment Details */}
          <h3 className={styles.finalTitle}>Final Payment Details</h3>
          <section className={styles.finalGrid}>
            <section className={styles.finalCell}>
              <span className={styles.finalLabel}>Opening Balance</span>
              <span className={styles.finalValue}>{formatCurrency(customer.openingCredit)}</span>
            </section>
            <section className={styles.finalCell}>
              <span className={styles.finalLabel}>Total Purchases</span>
              <span className={styles.finalValueBlue}>{formatCurrency(summary.creditSales)}</span>
            </section>
            <section className={styles.finalCell}>
              <span className={styles.finalLabel}>Payments Received</span>
              <span className={styles.finalValueGreen}>{formatCurrency(summary.cashReturns)}</span>
            </section>
            <section className={styles.finalCell}>
              <span className={styles.finalLabel}>Advance Used</span>
              <span className={styles.finalValueGreen}>{formatCurrency(summary.advanceApplied)}</span>
            </section>
          </section>
          <section className={styles.finalGrid}>
            <section className={styles.finalCell}>
              <span className={styles.finalLabel}>Total Collected</span>
              <span className={styles.finalValue}>{formatCurrency(summary.totalCollected)}</span>
            </section>
            <section className={styles.finalCell}>
              <span className={styles.finalLabel}>Available Advance</span>
              <span className={styles.finalValueGreen}>{formatCurrency(summary.availableAdvance)}</span>
            </section>
            <section className={styles.finalCell}>
              <span className={styles.finalLabel}>Remaining Balance</span>
              <span className={styles.finalValueRed}>{formatCurrency(summary.remainingBalance)}</span>
            </section>
          </section>

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
