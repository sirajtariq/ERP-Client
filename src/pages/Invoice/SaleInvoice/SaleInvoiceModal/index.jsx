import { useRef, useState, useEffect } from "react";
import { Modal, message, DatePicker, Checkbox, Tooltip } from "antd";
import { DeleteOutlined, RollbackOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { formatCurrency } from "@/utils";
import { logoSvgString } from "@/utils/logoSvg";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo, AppInput, AppSelect, AppButton } from "@/components/common";
import { receiveCustomerPayment } from "@/services/customerService";
import { createVendorPayment } from "@/services/supplierService";
import { createSalesReturn, getReturnedQuantitiesForInvoice } from "@/services/salesReturnService";
import styles from "./styles.module.css";

const PAYMENT_METHODS = [
  { label: "Cash",          value: "Cash" },
  { label: "Bank Transfer", value: "Bank Transfer" },
  { label: "JazzCash",      value: "JazzCash" },
  { label: "EasyPaisa",     value: "EasyPaisa" },
  { label: "Cheque",        value: "Cheque" },
];

const REFUND_TYPE_OPTIONS = [
  { label: "Cash",         value: "CASH" },
  { label: "Store Credit", value: "STORE_CREDIT" },
];

const RETURN_STATUS_OPTIONS = [
  { label: "Draft", value: "Draft" },
  { label: "Saved", value: "Saved" },
];

const InvoicePreview = ({ open, onClose, invoiceData, onDeleteItem, onRefresh }) => {
  const printRef = useRef();
  const { user } = useAuth();
  const companyInfo = getCompanyInfo();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [returnItems, setReturnItems] = useState(new Set());
  const [returnOpen, setReturnOpen]         = useState(false);
  const [returnItemEdits, setReturnItemEdits] = useState({});
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnedQtyByItem, setReturnedQtyByItem] = useState({});

  const receiveForm = useForm({
    mode: "onTouched",
    defaultValues: { amountReceived: "", method: "Cash", note: "", date: dayjs() },
  });

  const returnForm = useForm({
    mode: "onTouched",
    defaultValues: { date: dayjs(), refundType: "CASH", status: "Saved", reason: "", notes: "" },
  });

  useEffect(() => {
    if (!open) {
      setReceiveOpen(false);
      receiveForm.reset({ amountReceived: "", method: "Cash", note: "", date: dayjs() });
      setReturnOpen(false);
      returnForm.reset({ date: dayjs(), refundType: "CASH", status: "Saved", reason: "", notes: "" });
    }
    setReturnItems(new Set());
    setReturnItemEdits({});
    setReturnedQtyByItem({});
  }, [open, invoiceData?.id]);

  // Sum previously-returned quantities per line item, so the Qty input can be capped to
  // what's actually still returnable instead of defaulting to the full original quantity.
  useEffect(() => {
    if (open && invoiceData?.type !== "purchase" && invoiceData?.invoiceNo) {
      getReturnedQuantitiesForInvoice(invoiceData.invoiceNo)
        .then(setReturnedQtyByItem)
        .catch(() => setReturnedQtyByItem({}));
    }
  }, [open, invoiceData?.id]);

  const getRemainingQty = (item) => Math.max(0, (item.qty || 0) - (returnedQtyByItem[item.id] || 0));

  const toggleReturnItem = (idx, item) => {
    setReturnItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
        setReturnItemEdits((prevEdits) => {
          const { [idx]: _removed, ...rest } = prevEdits;
          return rest;
        });
      } else {
        next.add(idx);
        setReturnItemEdits((prevEdits) => ({
          ...prevEdits,
          [idx]: { quantity: getRemainingQty(item), rate: item.rate || 0, discount: item.discount || 0 },
        }));
      }
      return next;
    });
  };

  const handleReturnItemEdit = (idx, field, value) => {
    setReturnItemEdits((prev) => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }));
  };

  const handleCreateReturnEntry = () => {
    setReturnOpen(true);
  };

  const handleReturnSubmit = async (values) => {
    setReturnSubmitting(true);
    try {
      const payload = {
        invoice:      invoiceData.id,
        status:       values.status,
        refund_type:  values.refundType,
        return_date:  values.date ? values.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        reason:       values.reason || "",
        notes:        values.notes  || "",
        items: [...returnItems].map((idx) => {
          const item = validItems[idx];
          const edit = returnItemEdits[idx] || {};
          return {
            sales_item: item.id || null,
            item_name:  item.name,
            quantity:   String(edit.quantity ?? item.qty ?? 0),
            rate:       String(edit.rate ?? item.rate ?? 0),
            discount:   String(edit.discount ?? item.discount ?? 0),
          };
        }),
      };
      await createSalesReturn(payload);
      message.success("Return entry created successfully");
      setReturnOpen(false);
      setReturnItems(new Set());
      setReturnItemEdits({});
      returnForm.reset({ date: dayjs(), refundType: "CASH", status: "Saved", reason: "", notes: "" });
      onClose();
      onRefresh?.();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to create return entry";
      message.error(errorMsg);
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleReceiveSubmit = async (values) => {
    setSubmitting(true);
    try {
      const formDate = values.date ? values.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");

      if (isPurchase) {
        const payload = {
          date: formDate,
          vendor: {
            id:         invoiceData.customer?.id,
            vendorName: invoiceData.customer?.name  || "",
            phone:      invoiceData.customer?.phone || "",
          },
          invoice:    invoiceData.invoiceNo || null,
          amountPaid: String(values.amountReceived),
          method:     values.method,
          notes:      values.note || "",
        };
        await createVendorPayment(payload);
      } else {
        const payload = {
          date:            formDate,
          customer:        invoiceData.customer?.id,
          invoice:         invoiceData.id,
          amount_received: String(values.amountReceived),
          method:          values.method,
          notes:           values.note || null,
        };
        await receiveCustomerPayment(payload);
      }

      message.success("Payment received successfully");
      setReceiveOpen(false);
      receiveForm.reset({ amountReceived: "", method: "Cash", note: "", date: dayjs() });
      onClose();
      onRefresh?.();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to save payment";
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!invoiceData) return null;

  const {
    customer, items, payment, grandTotal, date, type, billNumber,
    paymentStatus, invoiceStatus, subtotal, taxAmount, totalLineDiscount,
  } = invoiceData;
  const isPurchase = type === "purchase";
  const showReturnColumn = !isPurchase;
  // Backend only allows returns against invoices that are already 'Saved'.
  const canReturn = showReturnColumn && invoiceStatus === "Saved";
  const invoiceLabel = isPurchase ? "PURCHASE INVOICE" : "SALE INVOICE";
  const customerName = customer?.name || customer?.customerName || "N/A";
  const customerPhone = customer?.phone || "N/A";
  const customerAddress = customer?.address || "N/A";
  const invoiceNo = invoiceData.invoiceNo || "Auto Generated";
  const invoiceDate = date || new Date().toLocaleDateString("en-PK");

  const now = new Date();
  const printDate = now.toLocaleString("en-PK", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const paidAmount = payment?.paidAmount || 0;
  const remaining = Math.max(0, grandTotal - paidAmount);
  const paymentMethod = payment?.method === "cash" ? "Cash" : "Credit";
  const paymentTerms = payment?.terms || "N/A";
  const advanceApplied = payment?.advanceApplied || 0;

  const PAYMENT_STATUS_COLORS = { Paid: "#22c55e", Unpaid: "#ef4444", Partial: "#f97316", Advance: "#3b82f6" };
  const INVOICE_STATUS_COLORS = { Saved: "#22c55e", Draft: "#ef4444" };
  const displayPaymentStatus = paymentStatus || (paidAmount >= grandTotal ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid");

  const validItems = (items || []).filter((i) => i.name || i.qty || i.rate || i.total);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(buildPrintHTML());
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const buildPrintHTML = () => {
    const itemRows = validItems.map((item, i) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:center;">${i + 1}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${item.name}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:center;">${item.unit || "-"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;">${item.qty || 0}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;">${formatCurrency(item.rate || 0)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;">${item.discount || 0}%</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;font-weight:700;">${formatCurrency(item.total || 0)}</td>
      </tr>
    `).join("");

    return `<html><head><title>Invoice - ${customerName}</title>
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
            <h2 style="font-size:18px;font-weight:800;color:#141423;margin:0 0 6px;">${invoiceLabel}</h2>
            <p style="font-size:12px;color:#475569;"><strong>Invoice:</strong> ${invoiceNo}</p>
            <p style="font-size:12px;color:#475569;"><strong>Date:</strong> ${invoiceDate}</p>
            <p style="font-size:12px;color:#475569;"><strong>Printed:</strong> ${printDate}</p>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;border:1px solid #3b82f6;border-radius:6px;padding:16px;">
            <h3 style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;margin:0 0 10px;">BILL TO</h3>
            <h4 style="font-size:16px;font-weight:700;margin:0 0 8px;">${customerName}</h4>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Phone:</strong> ${customerPhone}</p>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Address:</strong> ${customerAddress}</p>
          </div>
          <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
            <h3 style="font-size:11px;font-weight:700;color:#141423;text-transform:uppercase;margin:0 0 10px;">PAYMENT INFO</h3>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Method:</strong> ${paymentMethod}</p>
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Terms:</strong> ${paymentTerms}</p>
            ${payment?.paymentReference ? `<p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Reference:</strong> ${payment.paymentReference}</p>` : ""}
            <p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Payment Status:</strong> <span style="font-weight:700;color:${PAYMENT_STATUS_COLORS[displayPaymentStatus] || "#64748b"}">${displayPaymentStatus}</span></p>
            ${invoiceStatus ? `<p style="font-size:12px;color:#475569;margin:3px 0;"><strong>Invoice Status:</strong> <span style="font-weight:700;color:${INVOICE_STATUS_COLORS[invoiceStatus] || "#64748b"}">${invoiceStatus}</span></p>` : ""}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead><tr style="background:#141423;">
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:center;border:1px solid rgba(255,255,255,0.1);width:5%">#</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Item</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:center;border:1px solid rgba(255,255,255,0.1);">Unit</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Qty</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Rate</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Discount</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Total</th>
          </tr></thead>
          <tbody>${itemRows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#94a3b8;">No items added yet</td></tr>'}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
          <div style="width:280px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            ${subtotal > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;">Subtotal</span><span style="font-weight:700;">${formatCurrency(subtotal)}</span></div>` : ""}
            ${totalLineDiscount > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;">Discount</span><span style="font-weight:700;color:#ef4444;">- ${formatCurrency(totalLineDiscount)}</span></div>` : ""}
            ${taxAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;">Tax${payment?.vatPercentage ? ` (${payment.vatPercentage}%)` : ""}</span><span style="font-weight:700;">${formatCurrency(taxAmount)}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;">
              <span style="color:#64748b;">Grand Total</span><span style="font-weight:700;">${formatCurrency(grandTotal)}</span>
            </div>
            ${advanceApplied > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;">Advance Applied</span><span style="font-weight:700;color:#22c55e;">- ${formatCurrency(advanceApplied)}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;">
              <span style="color:#64748b;">Paid</span><span style="font-weight:700;color:#22c55e;">${formatCurrency(paidAmount)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#f8fafc;">
              <span style="color:#64748b;">Remaining</span><span style="font-weight:700;color:${remaining > 0 ? '#ef4444' : '#22c55e'};">${formatCurrency(remaining)}</span>
            </div>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:4px;padding:12px 16px;margin:20px 0;font-size:12px;color:#475569;line-height:1.7;">
          <p><strong>Generated:</strong> ${printDate}</p>
          <p><strong>Generated By:</strong> ${user?.name || user?.username}</p>
          <p>Computer generated invoice.</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          <span>Computer generated sale invoice.</span>
          <div style="text-align:center;">
            <div style="width:160px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div>
            <span>Authorized Signature</span>
          </div>
        </div>
      </body></html>`;
  };

  return (
    <Modal
      open={open}
      onCancel={() => { setReceiveOpen(false); receiveForm.reset({ amountReceived: "", method: "Cash", note: "", date: dayjs() }); onClose(); }}
      footer={null}
      width="90%"
      style={{ maxWidth: 1000, top: 20 }}
      closable={false}
      destroyOnClose
      className={styles.previewModal}
    >
      <section className={styles.header}>
        <h2 className={styles.headerTitle}>Invoice Preview - {customerName}</h2>
        <section className={styles.headerActions}>
          <AppButton className={styles.recBtn} onClick={() => setReceiveOpen((v) => !v)}>Receive Payment</AppButton>
          <AppButton className={styles.printBtn} onClick={handlePrint}>Print</AppButton>
          <AppButton className={styles.pdfBtn} onClick={handlePrint}>Download PDF</AppButton>
          <AppButton className={styles.closeBtn} onClick={onClose}>Close</AppButton>
        </section>
      </section>

      {receiveOpen && (
        <section style={{ padding: "16px 24px", borderBottom: "1px solid #eef0f6", background: "#f8fafc" }}>
          <h4 style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text)", marginBottom: 12 }}>Receive Payment</h4>
          <section style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <section style={{ flex: 1, minWidth: 160 }}>
              <Controller
                name="date"
                control={receiveForm.control}
                render={({ field }) => (
                  <section>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 4 }}>Date</label>
                    <DatePicker {...field} style={{ width: "100%" }} />
                  </section>
                )}
              />
            </section>
            <section style={{ flex: 1, minWidth: 160 }}>
              <Controller
                name="amountReceived"
                control={receiveForm.control}
                rules={{ required: "Amount is required", min: { value: 1, message: "Must be greater than 0" } }}
                render={({ field }) => (
                  <AppInput
                    {...field}
                    onChange={(val) => { if (val === null || val === undefined || !isNaN(val)) field.onChange(val); }}
                    inputType="number"
                    label="Amount Received"
                    name="amountReceived"
                    placeholder="0"
                    min={1}
                    required
                    errors={receiveForm.formState.errors}
                  />
                )}
              />
            </section>
            <section style={{ flex: 1, minWidth: 160 }}>
              <Controller
                name="method"
                control={receiveForm.control}
                rules={{ required: "Method is required" }}
                render={({ field }) => (
                  <AppSelect {...field} label="Method" name="method" options={PAYMENT_METHODS} required errors={receiveForm.formState.errors} />
                )}
              />
            </section>
            <section style={{ flex: 1, minWidth: 160 }}>
              <Controller
                name="note"
                control={receiveForm.control}
                render={({ field }) => (
                  <AppInput {...field} label="Note" name="note" placeholder="Optional" errors={receiveForm.formState.errors} />
                )}
              />
            </section>
          </section>
          <section style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <AppButton type="default" size="small" onClick={() => { setReceiveOpen(false); receiveForm.reset({ amountReceived: "", method: "Cash", note: "", date: dayjs() }); }}>Cancel</AppButton>
            <AppButton type="primary" size="small" className="btn-dark" loading={submitting} disabled={!receiveForm.formState.isValid} onClick={receiveForm.handleSubmit(handleReceiveSubmit)}>Save Payment</AppButton>
          </section>
        </section>
      )}

      <section className={styles.scrollArea}>
        <section className={styles.page} ref={printRef}>

          {/* Company Header */}
          <section className={styles.companyHeader}>
            <section className={styles.companyLeft}>
              <CompanyLogo size={50} />
              <section>
                <h1 className={styles.companyName}>{companyInfo.name}</h1>
                <p className={styles.detail}><strong>Contact:</strong> {companyInfo.contact} &nbsp;&nbsp;<strong>WhatsApp:</strong> {companyInfo.whatsapp}</p>
                <p className={styles.detail}><strong>Email:</strong> {companyInfo.email}</p>
                <p className={styles.detail}><strong>Address:</strong> {companyInfo.address}</p>
              </section>
            </section>
            <section className={styles.companyRight}>
              <h2 className={styles.invoiceLabel}>{invoiceLabel}</h2>
              <p className={styles.detail}><strong>Invoice:</strong> {invoiceNo}</p>
              <p className={styles.detail}><strong>Date:</strong> {invoiceDate}</p>
              <p className={styles.detail}><strong>Printed:</strong> {printDate}</p>
            </section>
          </section>

          {/* Bill To + Payment */}
          <section className={styles.detailsRow}>
            <section className={styles.billBox}>
              <h3 className={styles.boxTitle}>BILL TO</h3>
              <h4 className={styles.custName}>{customerName}</h4>
              <p className={styles.detail}><strong>Phone:</strong> {customerPhone}</p>
              <p className={styles.detail}><strong>Address:</strong> {customerAddress}</p>
              {isPurchase && billNumber && <p className={styles.detail}><strong>Supplier Bill #:</strong> {billNumber}</p>}
            </section>
            <section className={styles.payBox}>
              <h3 className={styles.boxTitleDark}>PAYMENT INFO</h3>
              <p className={styles.detail}><strong>Method:</strong> {paymentMethod}</p>
              <p className={styles.detail}><strong>Terms:</strong> {paymentTerms}</p>
              {payment?.paymentReference && (
                <p className={styles.detail}><strong>Reference:</strong> {payment.paymentReference}</p>
              )}
              <p className={styles.detail}>
                <strong>Payment Status:</strong>{" "}
                <span style={{ fontWeight: 700, color: PAYMENT_STATUS_COLORS[displayPaymentStatus] || "#64748b" }}>
                  {displayPaymentStatus}
                </span>
              </p>
              {invoiceStatus && (
                <p className={styles.detail}>
                  <strong>Invoice Status:</strong>{" "}
                  <span style={{ fontWeight: 700, color: INVOICE_STATUS_COLORS[invoiceStatus] || "#64748b" }}>
                    {invoiceStatus}
                  </span>
                </p>
              )}
            </section>
          </section>

          {/* Items Table */}
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHead}>
                {showReturnColumn && (
                  <th className={styles.thCenter} style={{ width: "9%" }}>
                    <Tooltip title="Mark item(s) for a return / reverse entry">Return</Tooltip>
                  </th>
                )}
                <th className={styles.thCenter} style={{ width: "5%" }}>#</th>
                <th className={styles.th} style={{ width: isPurchase ? "28%" : (showReturnColumn ? "13%" : "22%") }}>Item</th>
                <th className={styles.thCenter} style={{ width: isPurchase ? "12%" : "10%" }}>Unit</th>
                <th className={styles.thRight} style={{ width: isPurchase ? "12%" : "10%" }}>Qty</th>
                <th className={styles.thRight} style={{ width: isPurchase ? "15%" : "13%" }}>Rate</th>
                {!isPurchase && <th className={styles.thRight} style={{ width: "13%" }}>Discount</th>}
                <th className={styles.thRight} style={{ width: isPurchase ? "18%" : "17%" }}>Total</th>
                <th className={styles.thCenter} style={{ width: "10%" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {validItems.length > 0 ? validItems.map((item, i) => {
                const remainingQty = getRemainingQty(item);
                const returnDisabled = !canReturn || remainingQty <= 0;
                const returnTooltip = !canReturn
                  ? "Returns are only allowed once the invoice status is 'Saved'"
                  : remainingQty <= 0
                    ? "All units of this item have already been returned"
                    : "";
                return (
                <tr key={i} className={`${styles.tableRow} ${showReturnColumn && returnItems.has(i) ? styles.returnRow : ""}`}>
                  {showReturnColumn && (
                    <td className={styles.tdCenter}>
                      <Tooltip title={returnTooltip}>
                        <Checkbox
                          checked={returnItems.has(i)}
                          disabled={returnDisabled}
                          onChange={() => toggleReturnItem(i, item)}
                          aria-label={`Mark "${item.name}" for return`}
                        />
                      </Tooltip>
                    </td>
                  )}
                  <td className={styles.tdCenter}>{i + 1}</td>
                  <td className={styles.td}>
                    {item.name}
                    {showReturnColumn && returnItems.has(i) && (
                      <span className={styles.returnTag}><RollbackOutlined /> Return</span>
                    )}
                  </td>
                  <td className={styles.tdCenter}>{item.unit || "-"}</td>
                  <td className={styles.tdRight}>{item.qty || 0}</td>
                  <td className={styles.tdRight}>{formatCurrency(item.rate || 0)}</td>
                  {!isPurchase && <td className={styles.tdRight}>{item.discount || 0}%</td>}
                  <td className={`${styles.tdRight} ${styles.bold}`}>{formatCurrency(item.total || 0)}</td>
                  <td className={styles.tdCenter}>
                    <button className={styles.deleteItemBtn} onClick={() => onDeleteItem && onDeleteItem(i)}>
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
                );
              }) : (
                <tr><td colSpan={isPurchase ? 7 : (showReturnColumn ? 9 : 8)} className={styles.emptyRow}>No items added yet</td></tr>
              )}
            </tbody>
          </table>

          {showReturnColumn && !canReturn && (
            <section style={{ padding: "10px 14px", marginBottom: 16, border: "1px solid #fde68a", borderRadius: 6, background: "#fffbeb", fontSize: 12, color: "#92400e" }}>
              Returns can only be created once this invoice's status is <strong>Saved</strong>{invoiceStatus ? ` (currently ${invoiceStatus})` : ""}.
            </section>
          )}

          {canReturn && returnItems.size > 0 && !returnOpen && (
            <section className={styles.returnBar}>
              <span className={styles.returnBarText}>
                <RollbackOutlined /> {returnItems.size} item{returnItems.size > 1 ? "s" : ""} marked for return
              </span>
              <AppButton size="small" className={styles.returnBarBtn} onClick={handleCreateReturnEntry}>
                Create Return Entry
              </AppButton>
            </section>
          )}

          {canReturn && returnOpen && (
            <section style={{ padding: 16, marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
              <h4 style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text)", marginBottom: 12 }}>
                <RollbackOutlined /> Create Return Entry ({returnItems.size} item{returnItems.size > 1 ? "s" : ""})
              </h4>

              {[...returnItems].map((idx) => {
                const item = validItems[idx];
                const edit = returnItemEdits[idx] || {};
                const remainingQty = getRemainingQty(item);
                return (
                  <section key={idx} style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 2 }}>{item.name}</p>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                      Max returnable: {remainingQty} of {item.qty}
                      {returnedQtyByItem[item.id] > 0 ? ` (${returnedQtyByItem[item.id]} already returned)` : ""}
                    </p>
                    <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <section style={{ width: 100 }}>
                        <AppInput label="Qty" inputType="number" min={0} max={remainingQty} value={edit.quantity} onChange={(val) => handleReturnItemEdit(idx, "quantity", val)} />
                      </section>
                      <section style={{ width: 100 }}>
                        <AppInput label="Rate" inputType="number" min={0} value={edit.rate} onChange={(val) => handleReturnItemEdit(idx, "rate", val)} disabled />
                      </section>
                      <section style={{ width: 100 }}>
                        <AppInput label="Disc (%)" inputType="number" min={0} max={100} value={edit.discount} onChange={(val) => handleReturnItemEdit(idx, "discount", val)} disabled />
                      </section>
                    </section>
                  </section>
                );
              })}

              <section style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginTop: 8 }}>
                <section style={{ flex: 1, minWidth: 150 }}>
                  <Controller
                    name="date"
                    control={returnForm.control}
                    render={({ field }) => (
                      <section>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 4 }}>Return Date</label>
                        <DatePicker {...field} style={{ width: "100%" }} />
                      </section>
                    )}
                  />
                </section>
                <section style={{ flex: 1, minWidth: 150 }}>
                  <Controller
                    name="refundType"
                    control={returnForm.control}
                    render={({ field }) => (
                      <AppSelect {...field} label="Refund Type" name="refundType" options={REFUND_TYPE_OPTIONS} />
                    )}
                  />
                </section>
                <section style={{ flex: 1, minWidth: 150 }}>
                  <Controller
                    name="status"
                    control={returnForm.control}
                    render={({ field }) => (
                      <AppSelect {...field} label="Status" name="status" options={RETURN_STATUS_OPTIONS} />
                    )}
                  />
                </section>
              </section>

              <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <section style={{ flex: 1, minWidth: 200 }}>
                  <Controller
                    name="reason"
                    control={returnForm.control}
                    rules={{ required: "Reason is required" }}
                    render={({ field }) => (
                      <AppInput {...field} label="Reason" name="reason" placeholder="e.g. Damaged item" required errors={returnForm.formState.errors} />
                    )}
                  />
                </section>
                <section style={{ flex: 1, minWidth: 200 }}>
                  <Controller
                    name="notes"
                    control={returnForm.control}
                    render={({ field }) => (
                      <AppInput {...field} label="Notes" name="notes" placeholder="Optional" />
                    )}
                  />
                </section>
              </section>

              <section style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <AppButton type="default" size="small" onClick={() => setReturnOpen(false)}>Cancel</AppButton>
                <AppButton
                  type="primary"
                  size="small"
                  className="btn-dark"
                  loading={returnSubmitting}
                  disabled={!returnForm.formState.isValid || returnSubmitting}
                  onClick={returnForm.handleSubmit(handleReturnSubmit)}
                >
                  Save Return
                </AppButton>
              </section>
            </section>
          )}

          {/* Totals */}
          <section className={styles.totalsWrapper}>
            <section className={styles.totalsBox}>
              {subtotal > 0 && (
                <section className={styles.totalRow}>
                  <span>Subtotal</span>
                  <span className={styles.bold}>{formatCurrency(subtotal)}</span>
                </section>
              )}
              {totalLineDiscount > 0 && (
                <section className={styles.totalRow}>
                  <span>Discount</span>
                  <span className={styles.redText}>- {formatCurrency(totalLineDiscount)}</span>
                </section>
              )}
              {taxAmount > 0 && (
                <section className={styles.totalRow}>
                  <span>Tax{payment?.vatPercentage ? ` (${payment.vatPercentage}%)` : ""}</span>
                  <span className={styles.bold}>{formatCurrency(taxAmount)}</span>
                </section>
              )}
              <section className={styles.totalRow}>
                <span>Grand Total</span>
                <span className={styles.bold}>{formatCurrency(grandTotal)}</span>
              </section>
              {advanceApplied > 0 && (
                <section className={styles.totalRow}>
                  <span>Advance Applied</span>
                  <span className={styles.greenText}>- {formatCurrency(advanceApplied)}</span>
                </section>
              )}
              <section className={styles.totalRow}>
                <span>Paid</span>
                <span className={styles.greenText}>{formatCurrency(paidAmount)}</span>
              </section>
              <section className={`${styles.totalRow} ${styles.totalRowLast}`}>
                <span>Remaining</span>
                <span className={remaining > 0 ? styles.redText : styles.greenText}>
                  {formatCurrency(remaining)}
                </span>
              </section>
            </section>
          </section>

          {/* Footer */}
          <section className={styles.genBox}>
            <p><strong>Generated:</strong> {printDate}</p>
            <p><strong>Generated By:</strong> {user?.name || user?.username}</p>
            <p>Computer generated invoice.</p>
          </section>

          <section className={styles.sigRow}>
            <span>Computer generated sale invoice.</span>
            <section className={styles.sigBlock}>
              <span className={styles.sigLine} />
              <span>Authorized Signature</span>
            </section>
          </section>
        </section>
      </section>
    </Modal>
  );
};

export default InvoicePreview;
