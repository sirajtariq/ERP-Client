import { useState, useEffect } from "react";
import { Modal, Table, Row, Col, Spin, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import { DollarOutlined, FileAddOutlined } from "@ant-design/icons";
import { AppButton, AppInput, AppSelect, StatCard } from "@/components/common";
import { getVendorLedger, normalizeVendorLedger, createVendorPayment, patchVendor } from "@/services/supplierService";
import { formatCurrency } from "@/utils";
import { logoSvgString } from "@/utils/logoSvg";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { useAuth } from "@/context/AuthContext";
import styles from "./styles.module.css";

const PAYMENT_METHODS = [
  { label: "Cash", value: "Cash" },
  { label: "Bank Transfer", value: "Bank Transfer" },
  { label: "Cheque", value: "Cheque" },
  { label: "Other", value: "Other" },
];


const LedgerModal = ({ open, onClose, supplier, onUpdated }) => {
  const { user } = useAuth();
  const companyInfo = getCompanyInfo();
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handlePrint = () => {
    if (!ledger) return;
    const now = new Date();
    const printDate = now.toLocaleString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const rows = (ledger.transactions || []).map((t) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${t.date}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;font-weight:600;">${t.voucher}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;">${t.description}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;">${t.debit ? formatCurrency(t.debit) : "-"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;">${t.credit ? formatCurrency(t.credit) : "-"}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-size:12px;text-align:right;font-weight:700;color:${t.type === "Cr" ? "#22c55e" : "#1e293b"};">${formatCurrency(t.balance)} ${t.type}</td>
      </tr>
    `).join("");

    const summaryCell = (label, value, color) => `<div style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;"><div style="font-size:11px;color:#64748b;font-weight:600;">${label}</div><div style="font-size:14px;font-weight:700;color:${color || "#1e293b"};">${value}</div></div>`;

    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Vendor Ledger - ${supplier.name}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:12px}@media print{body{padding:16px}}</style>
      </head><body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #141423;">
          <div style="display:flex;gap:14px;">${logoSvgString(50)}<div>
            <h1 style="font-size:20px;font-weight:800;margin:0 0 4px;">${companyInfo.name}</h1>
            <p style="font-size:12px;color:#475569;">${companyInfo.contact} | ${companyInfo.email}</p>
            <p style="font-size:12px;color:#475569;">${companyInfo.address}</p>
          </div></div>
          <div style="text-align:right;">
            <h2 style="font-size:18px;font-weight:800;color:#141423;">SUPPLIER LEDGER</h2>
            <p style="font-size:12px;color:#475569;"><strong>Printed:</strong> ${printDate}</p>
          </div>
        </div>
        <div style="border:1px solid #3b82f6;border-radius:6px;padding:16px;margin-bottom:16px;">
          <h3 style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;margin:0 0 8px;">SUPPLIER DETAILS</h3>
          <h4 style="font-size:16px;font-weight:700;margin:0 0 6px;">${supplier.name}</h4>
          <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Phone:</strong> ${supplier.phone || "N/A"}</p>
          <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Address:</strong> ${supplier.address || "N/A"}</p>
          <p style="font-size:12px;color:#475569;margin:2px 0;"><strong>Products:</strong> ${supplier.products || "N/A"}</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
          ${summaryCell("Opening Balance", formatCurrency(ledger.openingPayable), "#f97316")}
          ${summaryCell("Credit Purchases", formatCurrency(ledger.creditPurchases), "#ef4444")}
          ${summaryCell("Cash Purchases", formatCurrency(ledger.cashPurchases), "#ef4444")}
          ${summaryCell("Advance Applied", formatCurrency(ledger.advanceApplied), "#a855f7")}
          ${summaryCell("Total Paid", formatCurrency(ledger.totalPaid), "#22c55e")}
          ${summaryCell("Total Invoices", ledger.totalInvoices, "#64748b")}
          ${summaryCell("Available Advance", formatCurrency(ledger.availableAdvance), "#14b8a6")}
          ${summaryCell("Closing Balance", formatCurrency(ledger.closingBalance), "#3b82f6")}
          ${summaryCell("Remaining Balance", formatCurrency(ledger.remainingBalance), "#dc2626")}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead><tr style="background:#141423;">
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Date</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Voucher</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:left;border:1px solid rgba(255,255,255,0.1);">Description</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Debit</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Credit</th>
            <th style="padding:10px;font-size:12px;font-weight:600;color:#fff;text-align:right;border:1px solid rgba(255,255,255,0.1);">Balance</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="border:1px solid #e2e8f0;border-radius:4px;padding:12px 16px;font-size:12px;color:#475569;line-height:1.7;">
          <p><strong>Generated:</strong> ${printDate}</p>
          <p><strong>Generated By:</strong> ${user?.name || user?.username}</p>
          <p>Computer generated supplier ledger.</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          <span>Computer generated supplier ledger.</span>
          <div style="text-align:center;"><div style="width:160px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div><span>Authorized Signature</span></div>
        </div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const payForm = useForm({ mode: "onTouched", defaultValues: { amount: 0, method: "Cash", notes: "" } });
  const openingForm = useForm({ mode: "onTouched", defaultValues: { amount: 0, mode: "add" } });

  useEffect(() => {
    if (open && supplier) fetchLedger();
    if (!open) {
      setPayOpen(false);
      setOpeningOpen(false);
      setSelectedInvoice(null);
      payForm.reset();
      openingForm.reset();
    }
  }, [open, supplier]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await getVendorLedger(supplier.vendorId);
      setLedger(normalizeVendorLedger(data));
    } catch {
      message.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const handlePaySubmit = async (values) => {
    setSubmitting(true);
    try {
      await createVendorPayment({
        vendor: {
          id:         supplier.id,
          vendorName: supplier.name,
          phone:      supplier.phone,
        },
        invoice:    selectedInvoice || null,
        amountPaid: values.amount,
        method:     values.method,
        notes:      values.notes || "",
      });
      message.success("Payment recorded successfully");
      payForm.reset();
      setSelectedInvoice(null);
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to save payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpeningSubmit = async (values) => {
    setSubmitting(true);
    try {
      const newOpeningPayable = values.mode === "add"
        ? (supplier.openingPayable || 0) + Number(values.amount)
        : Number(values.amount);

      await patchVendor(supplier.vendorId, {
        vendorName:     supplier.name,
        openingPayable: newOpeningPayable,
      });
      message.success("Opening payable updated");
      openingForm.reset();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  // Payload's `invoice` field expects the invoice_number string, not a numeric id —
  // so use invoiceNumber as the select value directly, no extra lookup needed on submit.
  const invoiceOptions = (ledger?.invoices || []).map((inv) => ({
    label: inv.invoiceNumber,
    value: inv.invoiceNumber,
  }));

  const columns = [
    { title: "Date", dataIndex: "date", key: "date", width: "12%" },
    { title: "Voucher", dataIndex: "voucher", key: "voucher", width: "15%", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: "Description", dataIndex: "description", key: "description", width: "28%" },
    { title: "Debit", dataIndex: "debit", key: "debit", width: "13%", align: "right", render: (v) => v ? formatCurrency(v) : "-" },
    { title: "Credit", dataIndex: "credit", key: "credit", width: "13%", align: "right", render: (v) => v ? formatCurrency(v) : "-" },
    { title: "Balance", dataIndex: "balance", key: "balance", width: "19%", align: "right", render: (v, r) => <span style={{ fontWeight: 700, color: r.type === "Cr" ? "#22c55e" : "#1e293b" }}>{formatCurrency(v)} {r.type}</span> },
  ];

  if (!supplier) return null;

  return (
    <Modal open={open} onCancel={onClose} footer={null} width="90%" style={{ maxWidth: 1000, top: 20 }} closable={false} destroyOnClose className={styles.modal}>
      {/* Sticky Header */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Vendor Ledger — {supplier.name}</h2>
        <div className={styles.headerActions}>
          <button className={styles.payBtn} onClick={() => { setPayOpen(true); setOpeningOpen(false); }}><DollarOutlined /> Pay Vendor</button>
          <button className={styles.openingBtn} onClick={() => { setOpeningOpen(true); setPayOpen(false); }}><FileAddOutlined /> Opening Balance</button>
          <button className={styles.printBtn} onClick={handlePrint}>Print</button>
          <button className={styles.pdfBtn} onClick={handlePrint}>Download PDF</button>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.spinWrap}><Spin size="large" /></div>
        ) : (
          <>
            {/* Summary Cards */}
            {ledger && (
              <Row gutter={[12, 12]} className={styles.summaryRow}>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#f97316" title="Opening Balance" value={ledger.openingPayable} delay={0.02} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#ef4444" title="Credit Purchases" value={ledger.creditPurchases} delay={0.04} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#ef4444" title="Cash Purchases" value={ledger.cashPurchases} delay={0.06} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#a855f7" title="Advance Applied" value={ledger.advanceApplied} delay={0.08} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#22c55e" title="Total Paid" value={ledger.totalPaid} delay={0.1} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#64748b" title="Total Invoices" value={ledger.totalInvoices} isCurrency={false} delay={0.12} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#14b8a6" title="Available Advance" value={ledger.availableAdvance} delay={0.14} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#3b82f6" title="Closing Balance" value={ledger.closingBalance} delay={0.16} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <StatCard variant="bordered" borderColor="#dc2626" title="Remaining Balance" value={ledger.remainingBalance} delay={0.18} />
                </Col>
              </Row>
            )}

            {/* Pay Vendor Form */}
            {payOpen && (
              <div className={styles.inlineForm}>
                <h4 className={styles.formTitle}>Pay Vendor</h4>
                <Row gutter={12}>
                  <Col span={8}>
                    <Controller name="amount" control={payForm.control} rules={{ required: "Amount is required" }} render={({ field }) => (
                      <AppInput {...field} inputType="number" label="Amount" name="amount" placeholder="0" min={1} required errors={payForm.formState.errors} />
                    )} />
                  </Col>
                  <Col span={8}>
                    <Controller name="method" control={payForm.control} rules={{ required: "Method is required" }} render={({ field }) => (
                      <AppSelect {...field} label="Method" name="method" options={PAYMENT_METHODS} required errors={payForm.formState.errors} />
                    )} />
                  </Col>
                  <Col span={8}>
                    <AppSelect
                      label="Invoice (optional)"
                      placeholder={invoiceOptions.length === 0 ? "No invoices for this vendor" : "Search or select invoice"}
                      options={invoiceOptions}
                      showSearch
                      filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                      value={selectedInvoice}
                      onChange={(val) => setSelectedInvoice(val ?? null)}
                      allowClear
                    />
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={24}>
                    <Controller name="notes" control={payForm.control} render={({ field }) => (
                      <AppInput {...field} label="Notes" name="notes" placeholder="Optional" />
                    )} />
                  </Col>
                </Row>
                <div className={styles.formActions}>
                  <AppButton type="default" size="small" onClick={() => { setPayOpen(false); setSelectedInvoice(null); payForm.reset(); }}>Cancel</AppButton>
                  <AppButton type="primary" size="small" className="btn-dark" loading={submitting} disabled={!payForm.formState.isValid} onClick={payForm.handleSubmit(handlePaySubmit)}>Save Payment</AppButton>
                </div>
              </div>
            )}

            {/* Opening Balance Form */}
            {openingOpen && (
              <div className={styles.inlineForm}>
                <h4 className={styles.formTitle}>Opening Balance</h4>
                <Row gutter={12}>
                  <Col span={8}>
                    <Controller name="amount" control={openingForm.control} rules={{ required: "Amount is required" }} render={({ field }) => (
                      <AppInput {...field} inputType="number" label="Payable Amount" name="amount" placeholder="0" min={0} required errors={openingForm.formState.errors} />
                    )} />
                  </Col>
                </Row>
                <div className={styles.formActions}>
                  <AppButton type="default" size="small" onClick={() => { setOpeningOpen(false); openingForm.reset(); }}>Cancel</AppButton>
                  <AppButton type="primary" size="small" className="btn-dark" loading={submitting} disabled={!openingForm.formState.isValid} onClick={openingForm.handleSubmit(handleOpeningSubmit)}>Save Opening Balance</AppButton>
                </div>
              </div>
            )}

            {/* Ledger Table */}
            <Table
              columns={columns}
              dataSource={ledger?.transactions || []}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
              scroll={{ y: 350 }}
              className={styles.ledgerTable}
            />
          </>
        )}
      </div>
    </Modal>
  );
};

export default LedgerModal;
