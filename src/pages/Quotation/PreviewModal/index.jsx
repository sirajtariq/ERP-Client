import { useRef } from "react";
import { Modal } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency } from "@/utils";
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
    const rows = validItems.map((item, i) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;white-space:nowrap;">${i + 1}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;word-break:break-word;">${item.name}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;white-space:nowrap;">${item.unit || "-"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;white-space:nowrap;">${item.qty || 0}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;white-space:nowrap;">${formatCurrency(item.rate || 0)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;white-space:nowrap;">${parseFloat(item.discount) > 0 ? item.discount + '%' : '-'}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-weight:700;white-space:nowrap;">${formatCurrency(item.total || 0)}</td>
      </tr>
    `).join("");

    return `<html><head><title>Quotation - ${customerName}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:12px}@media print{body{padding:16px}}</style>
      </head><body>
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
            <h2 style="font-size:18px;font-weight:800;color:#141423;margin:0 0 6px;">QUOTATION</h2>
            ${quotationNo ? `<p style="font-size:12px;color:#475569;"><strong>No:</strong> ${quotationNo}</p>` : ""}
            ${displayStatus ? `<p style="font-size:12px;color:#475569;"><strong>Status:</strong> <span style="text-transform:capitalize;">${displayStatus}</span></p>` : ""}
            <p style="font-size:12px;color:#475569;"><strong>Date:</strong> ${date}</p>
            <p style="font-size:12px;color:#475569;"><strong>Valid:</strong> ${validityText}${validUntil ? ` (until ${validUntil})` : ""}</p>
            <p style="font-size:12px;color:#475569;"><strong>Printed:</strong> ${printDate}</p>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;border:1px solid #3b82f6;border-radius:6px;padding:16px;">
            <h3 style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;margin:0 0 10px;">CUSTOMER</h3>
            <h4 style="font-size:16px;font-weight:700;margin:0 0 4px;">${customerName}</h4>
            ${customer?.customerId ? `<p style="font-size:12px;color:#475569;"><strong>Code:</strong> ${customer.customerId}</p>` : ""}
            ${customer?.phone ? `<p style="font-size:12px;color:#475569;"><strong>Phone:</strong> ${customer.phone}</p>` : ""}
            ${customer?.customerType ? `<p style="font-size:12px;color:#475569;text-transform:capitalize;"><strong>Type:</strong> ${customer.customerType}</p>` : ""}
          </div>
          <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
            <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 10px;">TERMS</h3>
            <p style="font-size:12px;color:#475569;"><strong>Payment:</strong> ${paymentTerm || "N/A"}</p>
            <p style="font-size:12px;color:#475569;"><strong>Discount:</strong> ${discountPercent || 0}%</p>
            <p style="font-size:12px;color:#475569;"><strong>VAT:</strong> ${vatPercent || 0}%</p>
            ${convertedInvoice ? `<p style="font-size:12px;color:#475569;"><strong>Converted Invoice:</strong> #${convertedInvoice}</p>` : ""}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;">
          <thead><tr style="background:#141423;">
            <th style="padding:10px;color:#fff;text-align:center;border:1px solid rgba(255,255,255,0.1);width:5%">#</th>
            <th style="padding:10px;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Item</th>
            <th style="padding:10px;color:#fff;text-align:center;border:1px solid rgba(255,255,255,0.1);">Unit</th>
            <th style="padding:10px;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Qty</th>
            <th style="padding:10px;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Rate</th>
            <th style="padding:10px;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Disc %</th>
            <th style="padding:10px;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Total</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#94a3b8;">No items</td></tr>'}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
          <div style="width:280px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;font-size:13px;">
            <div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><span>Items Total</span><span style="font-weight:700;">${formatCurrency(itemsTotal)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><span>Discount (${discountPercent || 0}%)</span><span style="font-weight:700;color:#ef4444;">- ${formatCurrency(discountAmount || 0)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><span>VAT (${vatPercent || 0}%)</span><span style="font-weight:700;">${formatCurrency(vatAmount || 0)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#f8fafc;"><span style="font-weight:700;">Grand Total</span><span style="font-weight:800;font-size:15px;">${formatCurrency(grandTotal)}</span></div>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:4px;padding:12px 16px;margin:20px 0;font-size:12px;color:#475569;line-height:1.7;">
          <p><strong>Generated:</strong> ${printDate}</p>
          <p><strong>Generated By:</strong> ${user?.name || user?.username}</p>
          <p>Computer generated quotation.</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          <span>Computer generated quotation.</span>
          <div style="text-align:center;"><div style="width:160px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div><span>Authorized Signature</span></div>
        </div>
      </body></html>`;
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width="90%" style={{ maxWidth: 1000, top: 20 }} closable={false} destroyOnClose className={styles.previewModal}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Quotation Preview - {customerName}</h2>
        <div className={styles.headerActions}>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
          <button className={styles.pdfBtn} onClick={handlePrint}>Download PDF</button>
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
                <th className={styles.thCenter} style={{ width: "5%" }}>#</th>
                <th className={styles.th} style={{ width: "25%" }}>Item</th>
                <th className={styles.thCenter} style={{ width: "10%" }}>Unit</th>
                <th className={styles.thRight} style={{ width: "10%" }}>Qty</th>
                <th className={styles.thRight} style={{ width: "13%" }}>Rate</th>
                <th className={styles.thRight} style={{ width: "10%" }}>Disc %</th>
                <th className={styles.thRight} style={{ width: "17%" }}>Total</th>
                {onDeleteItem && <th className={styles.thCenter} style={{ width: "10%" }}>Action</th>}
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
              <div className={`${styles.totalRow} ${styles.totalRowLast}`}><span style={{ fontWeight: 700 }}>Grand Total</span><span style={{ fontSize: 16, fontWeight: 800 }}>{formatCurrency(grandTotal)}</span></div>
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
