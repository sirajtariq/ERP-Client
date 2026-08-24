import { useRef } from "react";
import { Modal } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency, downloadPDF } from "@/utils";
import { logoSvgString } from "@/utils/logoSvg";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/common";
import styles from "./styles.module.css";

const PreviewModal = ({ open, onClose, data, onDeleteItem }) => {
  const printRef = useRef();
  const { user } = useAuth();
  const companyInfo = getCompanyInfo();

  if (!data) return null;

  const {
    quotationNo, customer, items, date, validDays, validUntil, validityDisplay,
    paymentTerm, vatPercent, vatAmount, discountPercent, discountAmount, itemsTotal, grandTotal,
    status, effectiveStatus, convertedInvoice,
  } = data;
  const customerName = customer?.name || "N/A";
  const validItems = (items || []).filter((i) => i.name || i.qty || i.rate || i.total);
  const displayStatus = effectiveStatus || status || "";
  const validityText = validityDisplay || (validDays ? `${validDays} days` : "N/A");

  const now = new Date();
  const printDate = now.toLocaleString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(buildPrintHTML());
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const buildPrintHTML = () => {
    const TH = `padding:10px 12px;font-size:11px;font-weight:700;color:#fff;border:1px solid #334155;`;
    const TD = `padding:9px 12px;font-size:12px;color:#1e293b;border:1px solid #e2e8f0;`;

    const rows = validItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="${TD}text-align:center;">${i + 1}</td>
        <td style="${TD}word-break:break-word;">${item.name}</td>
        <td style="${TD}text-align:center;">${item.unit || "-"}</td>
        <td style="${TD}text-align:right;">${item.qty || 0}</td>
        <td style="${TD}text-align:right;">${formatCurrency(item.rate || 0)}</td>
        <td style="${TD}text-align:center;">${parseFloat(item.discount) > 0 ? item.discount + "%" : "-"}</td>
        <td style="${TD}text-align:right;font-weight:700;">${formatCurrency(item.total || 0)}</td>
      </tr>
    `).join("");

    return `<html><head><title>Quotation - ${customerName}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;color:#1e293b;background:#fff;font-size:12px;}
        @media print{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      </style>
      </head><body style="padding:24px;">
        <!-- Purple gradient top bar -->
        <div style="height:6px;background:linear-gradient(90deg,#7c5cfc,#a78bfa);border-radius:3px;margin-bottom:20px;"></div>

        <!-- Company header -->
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
            <div style="display:inline-block;background:linear-gradient(135deg,#7c5cfc,#a78bfa);color:#fff;font-size:15px;font-weight:800;padding:6px 20px;border-radius:20px;margin-bottom:10px;letter-spacing:0.5px;">QUOTATION</div>
            ${quotationNo ? `<p style="font-size:12px;color:#374151;margin:3px 0;"><strong>No:</strong> ${quotationNo}</p>` : ""}
            ${displayStatus ? `<p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Status:</strong> <span style="text-transform:capitalize;">${displayStatus}</span></p>` : ""}
            <p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Date:</strong> ${date}</p>
            <p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Valid:</strong> ${validityText}${validUntil ? ` (until ${validUntil})` : ""}</p>
            <p style="font-size:12px;color:#374151;margin:3px 0;"><strong>Printed:</strong> ${printDate}</p>
          </div>
        </div>

        <!-- Divider -->
        <div style="height:1px;background:linear-gradient(90deg,rgba(124,92,252,0.4),#e2e8f0);margin-bottom:16px;"></div>

        <!-- Customer + Terms -->
        <div style="display:flex;gap:16px;margin-bottom:18px;">
          <div style="flex:1;border-left:4px solid #7c5cfc;background:#faf8ff;border-radius:0 6px 6px 0;padding:14px 16px;">
            <h3 style="font-size:10px;font-weight:700;color:#7c5cfc;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">Customer</h3>
            <h4 style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 7px;">${customerName}</h4>
            ${customer?.customerId ? `<p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Code:</strong> ${customer.customerId}</p>` : ""}
            ${customer?.phone ? `<p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Phone:</strong> ${customer.phone}</p>` : ""}
            ${customer?.customerType ? `<p style="font-size:11px;color:#374151;margin:3px 0;text-transform:capitalize;"><strong>Type:</strong> ${customer.customerType}</p>` : ""}
          </div>
          <div style="flex:1;border-left:4px solid #94a3b8;background:#f8fafc;border-radius:0 6px 6px 0;padding:14px 16px;">
            <h3 style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">Terms</h3>
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Payment:</strong> ${paymentTerm || "N/A"}</p>
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Discount:</strong> ${discountPercent || 0}%</p>
            <p style="font-size:11px;color:#374151;margin:3px 0;"><strong>VAT:</strong> ${vatPercent || 0}%</p>
            ${convertedInvoice ? `<p style="font-size:11px;color:#374151;margin:3px 0;"><strong>Converted Invoice:</strong> #${convertedInvoice}</p>` : ""}
          </div>
        </div>

        <!-- Items table -->
        <div style="margin-bottom:18px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:linear-gradient(90deg,#1e293b,#334155);">
                <th style="${TH}text-align:center;width:4%">#</th>
                <th style="${TH}text-align:left;width:40%">Item</th>
                <th style="${TH}text-align:center;width:8%">Unit</th>
                <th style="${TH}text-align:right;width:7%">Qty</th>
                <th style="${TH}text-align:right;width:14%">Rate</th>
                <th style="${TH}text-align:center;width:10%">Disc %</th>
                <th style="${TH}text-align:right;width:17%">Total</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="7" style="padding:16px;text-align:center;color:#94a3b8;border:1px solid #e2e8f0;">No items</td></tr>`}</tbody>
          </table>
        </div>

        <!-- Totals -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
          <div style="width:290px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
            <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #e2e8f0;"><span style="color:#374151;">Items Total</span><span style="font-weight:700;color:#1e293b;">${formatCurrency(itemsTotal)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #e2e8f0;"><span style="color:#374151;">Discount (${discountPercent || 0}%)</span><span style="font-weight:700;color:#dc2626;">-${formatCurrency(discountAmount || 0)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #e2e8f0;"><span style="color:#374151;">VAT (${vatPercent || 0}%)</span><span style="font-weight:700;color:#1e293b;">${formatCurrency(vatAmount || 0)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:11px 14px;background:#1e293b;">
              <span style="color:#e2e8f0;font-weight:700;font-size:13px;">Grand Total</span><span style="font-weight:800;color:#fff;font-size:13px;">${formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <!-- Thank you card -->
        <div style="background:linear-gradient(135deg,#7c5cfc,#a78bfa);border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center;">
          <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 3px;">Thank you for choosing us!</p>
          <p style="color:rgba(255,255,255,0.85);font-size:11px;margin:0;">${companyInfo.name} &bull; ${companyInfo.contact}</p>
        </div>

        <!-- Footer -->
        <div style="border-top:2px solid rgba(124,92,252,0.2);padding-top:12px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#64748b;">
          <div>
            <p style="margin:2px 0;color:#374151;"><strong>Generated:</strong> ${printDate} &nbsp; <strong>By:</strong> ${user?.name || user?.username}</p>
            <p style="margin:2px 0;">Computer generated quotation.</p>
          </div>
          <div style="text-align:center;">
            <div style="width:150px;border-bottom:1px solid #94a3b8;margin-bottom:5px;"></div>
            <span style="color:#374151;">Authorized Signature</span>
          </div>
        </div>
        <div style="height:4px;background:linear-gradient(90deg,#7c5cfc,#a78bfa);border-radius:2px;margin-top:14px;"></div>
      </body></html>`;
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width="90%" style={{ maxWidth: 1000, top: 20 }} closable={false} destroyOnClose className={styles.previewModal}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Quotation Preview - {customerName}</h2>
        <div className={styles.headerActions}>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
          <button className={styles.pdfBtn} onClick={() => downloadPDF(buildPrintHTML(), quotationNo || "quotation")}>Download PDF</button>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.page} ref={printRef}>
          <div className={styles.companyHeader}>
            <div className={styles.companyLeft}>
              <CompanyLogo size={50} />
              <div>
                <h1 className={styles.companyName}>{companyInfo.name}</h1>
                <p className={styles.detail}><strong>Contact:</strong> {companyInfo.contact} &nbsp;<strong>Email:</strong> {companyInfo.email}</p>
                <p className={styles.detail}><strong>Address:</strong> {companyInfo.address}</p>
              </div>
            </div>
            <div className={styles.companyRight}>
              <h2 className={styles.invoiceLabel}>QUOTATION</h2>
              {quotationNo && <p className={styles.detail}><strong>No:</strong> {quotationNo}</p>}
              {displayStatus && <p className={styles.detail} style={{ textTransform: "capitalize" }}><strong>Status:</strong> {displayStatus}</p>}
              <p className={styles.detail}><strong>Date:</strong> {date}</p>
              <p className={styles.detail}><strong>Valid:</strong> {validityText}{validUntil ? ` (until ${validUntil})` : ""}</p>
              <p className={styles.detail}><strong>Printed:</strong> {printDate}</p>
            </div>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0 0 16px 0" }} />

          <div className={styles.detailsRow}>
            <div className={styles.billBox}>
              <h3 className={styles.boxTitle}>CUSTOMER</h3>
              <h4 className={styles.custName}>{customerName}</h4>
              {customer?.customerId && <p className={styles.detail}><strong>Code:</strong> {customer.customerId}</p>}
              {customer?.phone && <p className={styles.detail}><strong>Phone:</strong> {customer.phone}</p>}
              {customer?.customerType && <p className={styles.detail} style={{ textTransform: "capitalize" }}><strong>Type:</strong> {customer.customerType}</p>}
            </div>
            <div className={styles.payBox}>
              <h3 className={styles.boxTitleDark}>TERMS</h3>
              <p className={styles.detail}><strong>Payment:</strong> {paymentTerm || "N/A"}</p>
              <p className={styles.detail}><strong>Discount:</strong> {discountPercent || 0}%</p>
              <p className={styles.detail}><strong>VAT:</strong> {vatPercent || 0}%</p>
              {convertedInvoice && <p className={styles.detail}><strong>Converted Invoice:</strong> #{convertedInvoice}</p>}
            </div>
          </div>

          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHead}>
                <th className={styles.thCenter} style={{ width: "4%" }}>#</th>
                <th className={styles.th} style={{ width: "40%" }}>Item</th>
                <th className={styles.thCenter} style={{ width: "8%" }}>Unit</th>
                <th className={styles.thRight} style={{ width: "7%" }}>Qty</th>
                <th className={styles.thRight} style={{ width: "13%" }}>Rate</th>
                <th className={styles.thRight} style={{ width: "9%" }}>Disc %</th>
                <th className={styles.thRight} style={{ width: "15%" }}>Total</th>
                {onDeleteItem && <th className={styles.thCenter} style={{ width: "5%" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {validItems.length > 0 ? validItems.map((item, i) => (
                <tr key={i} className={styles.tableRow}>
                  <td className={styles.tdCenter}>{i + 1}</td>
                  <td className={styles.td}>{item.name}</td>
                  <td className={styles.tdCenter}>{item.unit || "-"}</td>
                  <td className={styles.tdRight}>{item.qty || 0}</td>
                  <td className={styles.tdRight}>{formatCurrency(item.rate || 0)}</td>
                  <td className={styles.tdRight}>{parseFloat(item.discount) > 0 ? `${item.discount}%` : "-"}</td>
                  <td className={`${styles.tdRight} ${styles.bold}`}>{formatCurrency(item.total || 0)}</td>
                  {onDeleteItem && (
                    <td className={styles.tdCenter}>
                      <button className={styles.deleteItemBtn} onClick={() => onDeleteItem(i)}><DeleteOutlined /></button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={onDeleteItem ? 8 : 7} className={styles.emptyRow}>No items added yet</td></tr>
              )}
            </tbody>
          </table>

          <div className={styles.totalsWrapper}>
            <div className={styles.totalsBox}>
              <div className={styles.totalRow}><span>Items Total</span><span className={styles.bold}>{formatCurrency(itemsTotal)}</span></div>
              <div className={styles.totalRow}><span>Discount ({discountPercent || 0}%)</span><span className={styles.redText}>- {formatCurrency(discountAmount || 0)}</span></div>
              <div className={styles.totalRow}><span>VAT ({vatPercent || 0}%)</span><span className={styles.bold}>{formatCurrency(vatAmount || 0)}</span></div>
              <div className={`${styles.totalRow} ${styles.totalRowGrand}`}><span>Grand Total</span><span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{formatCurrency(grandTotal)}</span></div>
            </div>
          </div>

          <div className={styles.genBox}>
            <p><strong>Generated:</strong> {printDate}</p>
            <p><strong>Generated By:</strong> {user?.name || user?.username}</p>
            <p>Computer generated quotation.</p>
          </div>

          <div className={styles.sigRow}>
            <span>Computer generated quotation.</span>
            <div className={styles.sigBlock}><div className={styles.sigLine} /><span>Authorized Signature</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PreviewModal;
