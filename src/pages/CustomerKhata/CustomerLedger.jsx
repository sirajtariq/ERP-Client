import { useState, useEffect } from "react";
import { Modal, Table, Spin, message, DatePicker, Popover } from "antd";
import { PhoneOutlined, IdcardOutlined, TagOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { StatCard, AppInput, AppSelect, AppButton } from "@/components/common";
import { getCustomerLedger, receiveCustomerPayment, patchCustomer } from "@/services/customerService";
import { formatCurrency, formatDate } from "@/utils";
import styles from "./ledger.module.css";

const PAYMENT_METHODS = [
  { label: "Cash",          value: "Cash" },
  { label: "Bank Transfer", value: "Bank Transfer" },
  { label: "JazzCash",      value: "JazzCash" },
  { label: "EasyPaisa",     value: "EasyPaisa" },
  { label: "Cheque",        value: "Cheque" },
];

const CustomerLedger = ({ open, onClose, customer, onPrint }) => {
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [openingBalanceOpen, setOpeningBalanceOpen] = useState(false);
  const [openingCredit, setOpeningCredit] = useState("");
  const [openingSubmitting, setOpeningSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const receiveForm = useForm({
    mode: "onTouched",
    defaultValues: { amountReceived: "", method: "Cash", note: "", date: dayjs() },
  });

  useEffect(() => {
    if (open && customer?.customerId) {
      fetchLedger();
    }
    if (!open) {
      setLedgerData(null);
      setReceiveOpen(false);
      setOpeningBalanceOpen(false);
      setOpeningCredit("");
      setSelectedInvoice(null);
      receiveForm.reset();
    }
  }, [open, customer]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await getCustomerLedger(customer.customerId);
      setLedgerData(data);
    } catch (err) {
      message.error("Failed to load customer ledger");
    } finally {
      setLoading(false);
    }
  };

  const handleOpeningBalanceSubmit = async () => {
    setOpeningSubmitting(true);
    try {
      const customerId = ledgerData?.customer?.customerId;
      await patchCustomer(customerId, { openingCredit: String(openingCredit) });
      message.success("Opening balance updated successfully");
      setOpeningBalanceOpen(false);
      setOpeningCredit("");
      fetchLedger();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to update opening balance";
      message.error(errorMsg);
    } finally {
      setOpeningSubmitting(false);
    }
  };

  const handleReceiveSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        date:             values.date ? values.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        customer:         customer?.id,
        invoice:          selectedInvoice || null,
        amount_received:  String(values.amountReceived),
        method:           values.method,
        notes:            values.note || null,
      };
      await receiveCustomerPayment(payload);
      message.success("Payment received successfully");
      setReceiveOpen(false);
      setSelectedInvoice(null);
      receiveForm.reset({ amountReceived: "", method: "Cash", note: "", date: dayjs() });
      fetchLedger();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to save payment";
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!customer) return null;

  const summary = ledgerData?.summary || {};
  const transactions = ledgerData?.ledger || [];
  const finalPayment = ledgerData?.finalPaymentDetails || {};
  const invoiceOptions = (ledgerData?.invoices || []).map((inv) => ({
    label: inv.invoice_number,
    value: inv.id,
  }));
  // Invoice is mandatory unless the customer is "permanent".
  const isPermanent = (customer?.customerType || ledgerData?.customer?.customerType) === "permanent";
  const invoiceValid = isPermanent || !!selectedInvoice;
  const formIsValid = receiveForm.formState.isValid && invoiceValid;

  const columns = [
    { title: "Date", dataIndex: "date", key: "date", width: "12%", render: (val) => val ? formatDate(val) : "-" },
    { title: "Voucher", dataIndex: "voucher", key: "voucher", width: "16%", render: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { title: "Description", dataIndex: "description", key: "description", width: "32%" },
    { title: "Debit", dataIndex: "debit", key: "debit", width: "12%", align: "left", render: (val) => val ? formatCurrency(val) : "-" },
    { title: "Credit", dataIndex: "credit", key: "credit", width: "12%", align: "left", render: (val) => val ? formatCurrency(val) : "-" },
    { title: "Balance", dataIndex: "balance", key: "balance", width: "16%", align: "left", render: (val) => <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(val || 0)}</span> },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ maxWidth: 1100, top: 20 }}
      closable={false}
      destroyOnClose
      className={styles.ledgerModal}
    >
      <section className={styles.header}>
        <h2 className={styles.title}>Customer Ledger — {customer.name}</h2>
        <section className={styles.headerActions}>
          {onPrint && (
            <button className={styles.printBtn} onClick={() => onPrint(ledgerData)}>Print Ledger</button>
          )}
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </section>
      </section>

      <section className={styles.customerInfo}>
        <span className={styles.customerInfoItem}>
          <IdcardOutlined style={{ color: "#7c5cfc" }} />
          {ledgerData?.customer?.customerId || customer?.customerId || "—"}
        </span>
        {(ledgerData?.customer?.phone || customer?.phone) && (
          <span className={styles.customerInfoItem}>
            <PhoneOutlined style={{ color: "#22c55e" }} />
            {ledgerData?.customer?.phone || customer?.phone}
          </span>
        )}
        {(ledgerData?.customer?.customerType || customer?.customerType) && (
          <span className={styles.customerInfoBadge}>
            <TagOutlined style={{ fontSize: 10 }} />
            {ledgerData?.customer?.customerType || customer?.customerType}
          </span>
        )}
      </section>

      <section className={styles.scrollArea}>
        {loading ? (
          <section style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Spin size="large" />
          </section>
        ) : (
          <>
            <section className={styles.actions}>
              <button
                className={`${styles.actionBtn} ${styles.greenBtn}`}
                onClick={() => setReceiveOpen((v) => !v)}
              >
                Receive Payment
              </button>
              <button
                className={`${styles.actionBtn} ${styles.orangeBtn}`}
                onClick={() => { setOpeningBalanceOpen((v) => !v); setReceiveOpen(false); }}
              >
                Opening Balance
              </button>
            </section>

            {receiveOpen && (
              <section className={styles.inlineForm}>
                <h4 className={styles.formTitle}>Receive Payment</h4>
                <section className={styles.formRow}>
                  <section className={styles.formCol} style={{ flex: "1 1 100%" }}>
                    <AppSelect
                      label={
                        <span>
                          Sale Invoice {!isPermanent && <span style={{ color: "#ef4444" }}>*</span>}
                          {isPermanent && <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}> (optional)</span>}
                        </span>
                      }
                      placeholder={invoiceOptions.length === 0 ? "No invoices for this customer" : "Search or select invoice"}
                      options={invoiceOptions}
                      showSearch
                      filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                      value={selectedInvoice}
                      onChange={(val) => setSelectedInvoice(val ?? null)}
                      allowClear
                      status={!isPermanent && !selectedInvoice ? "error" : ""}
                    />
                  </section>
                </section>
                <section className={styles.formRow}>
                  <section className={styles.formCol}>
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
                  <section className={styles.formCol}>
                    <Controller
                      name="amountReceived"
                      control={receiveForm.control}
                      rules={{ required: "Amount is required", min: { value: 1, message: "Amount must be greater than 0" } }}
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
                  <section className={styles.formCol}>
                    <Controller
                      name="method"
                      control={receiveForm.control}
                      rules={{ required: "Method is required" }}
                      render={({ field }) => (
                        <AppSelect {...field} label="Method" name="method" options={PAYMENT_METHODS} required errors={receiveForm.formState.errors} />
                      )}
                    />
                  </section>
                  <section className={styles.formCol}>
                    <Controller
                      name="note"
                      control={receiveForm.control}
                      render={({ field }) => (
                        <AppInput {...field} label="Note" name="note" placeholder="Optional" errors={receiveForm.formState.errors} />
                      )}
                    />
                  </section>
                </section>
                <section className={styles.formActions}>
                  <AppButton type="default" size="small" onClick={() => { setReceiveOpen(false); setSelectedInvoice(null); receiveForm.reset({ amountReceived: "", method: "Cash", note: "", date: dayjs() }); }}>Cancel</AppButton>
                  <AppButton type="primary" size="small" className="btn-dark" loading={submitting} disabled={!formIsValid} onClick={receiveForm.handleSubmit(handleReceiveSubmit)}>Save Payment</AppButton>
                </section>
              </section>
            )}

            {openingBalanceOpen && (
              <section className={styles.inlineForm}>
                <h4 className={styles.formTitle}>Opening Balance</h4>
                <section className={styles.formRow}>
                  <section className={styles.formCol}>
                    <AppInput
                      label="Opening Credit"
                      inputType="number"
                      min={0}
                      placeholder="0.00"
                      value={openingCredit}
                      onChange={(val) => setOpeningCredit(val)}
                    />
                  </section>
                </section>
                <section className={styles.formActions}>
                  <AppButton type="default" size="small" onClick={() => { setOpeningBalanceOpen(false); setOpeningCredit(""); }}>Cancel</AppButton>
                  <AppButton
                    type="primary"
                    size="small"
                    className="btn-dark"
                    loading={openingSubmitting}
                    disabled={openingCredit === "" || openingCredit === null}
                    onClick={handleOpeningBalanceSubmit}
                  >
                    Save
                  </AppButton>
                </section>
              </section>
            )}

            <section className={styles.cardsRow}>
              <StatCard variant="bordered" borderColor="#22c55e" title="Credit Sales" value={summary.creditSales || 0} delay={0.05} className={styles.valueGreen} />
              <StatCard variant="bordered" borderColor="#3b82f6" title="Total Purchases" value={finalPayment.totalPurchases || 0} delay={0.1} className={styles.valueBlue} />
              <StatCard variant="bordered" borderColor="#22c55e" title="Cash Returns" value={summary.cashReturn || 0} delay={0.15} className={styles.valueGreen} />
              <StatCard variant="bordered" borderColor="#22c55e" title="Advance Applied" value={summary.advanceApplied || 0} delay={0.2} className={styles.valueGreen} />
              <StatCard variant="bordered" borderColor="#ef4444" title="Remaining Balance" value={summary.remainingBalance || 0} delay={0.25} className={styles.valueRed} />
            </section>

            <section className={styles.cardsRow}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
                <StatCard variant="bordered" borderColor="#f97316" title="Total Invoices" value={summary.totalInvoices || 0} isCurrency={false} delay={0.3} />
                {(ledgerData?.invoices || []).length > 0 && (
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    title={<span style={{ fontWeight: 700, fontSize: 13 }}>Invoice Numbers</span>}
                    content={
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", minWidth: 180 }}>
                        {(ledgerData.invoices).map((inv) => (
                          <span key={inv.id} style={{ fontSize: 13, fontWeight: 600, color: "#7c5cfc", padding: "3px 0", borderBottom: "1px solid var(--color-border-light)" }}>
                            {inv.invoice_number}
                          </span>
                        ))}
                      </div>
                    }
                  >
                    <button style={{
                      width: "100%", padding: "4px 0", borderRadius: 6,
                      border: "1px solid #f97316", background: "rgba(249,115,22,0.06)",
                      color: "#f97316", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.14)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.06)"; }}
                    >
                      View Invoices
                    </button>
                  </Popover>
                )}
              </div>

              <StatCard variant="bordered" borderColor="#f97316" title="Opening Credit" value={customer.openingCredit || 0} delay={0.35} />
              <StatCard variant="bordered" borderColor="#8b5cf6" title="Available Advance" value={summary.availableAdvance || 0} delay={0.4} className={styles.valueGreen} />
              <StatCard variant="bordered" borderColor="#0ea5e9" title="Closing Balance" value={summary.closingBalance || 0} delay={0.45} />
            </section>

            <section className={styles.ledgerSection}>
              <Table
                columns={columns}
                dataSource={transactions}
                rowKey={(r, i) => `${r.voucher}_${i}`}
                pagination={false}
                size="small"
                bordered
                className={styles.ledgerTable}
                locale={{ emptyText: "No transactions found" }}
              />
            </section>

            <p className={styles.footerNote}>Computer generated ledger ◆ no signature required</p>
          </>
        )}
      </section>
    </Modal>
  );
};

export default CustomerLedger;
