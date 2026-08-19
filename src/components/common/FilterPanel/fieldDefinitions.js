// Maps a filterConfig "show" flag to the field it renders: key (used in the filters object),
// label, input type, and placeholder (for text fields). Select fields get their options
// passed in per-page via the FilterPanel's `options` prop.
export const FILTER_FIELD_DEFINITIONS = {
  showInvoiceNumber:   { key: "invoiceNumber",   label: "Invoice Number",   type: "text", placeholder: "Search invoice no." },
  showBillNumber:      { key: "billNumber",      label: "Bill Number",      type: "text", placeholder: "Search bill no." },
  showQuotationNumber: { key: "quotationNumber", label: "Quotation Number", type: "text", placeholder: "Search quotation no." },
  showReceiptNumber:   { key: "receiptNumber",   label: "Receipt Number",   type: "text", placeholder: "Search receipt no." },
  showVoucherNumber:   { key: "voucherNumber",   label: "Voucher Number",   type: "text", placeholder: "Search voucher no." },
  showPaidBy:          { key: "paidBy",          label: "Paid By",          type: "text", placeholder: "Search paid by" },
  showStartDate:       { key: "startDate",       label: "Start Date",       type: "date" },
  showEndDate:         { key: "endDate",         label: "End Date",        type: "date" },
  showPaymentStatus:   { key: "paymentStatus",   label: "Payment Status",  type: "select" },
  showStatus:          { key: "status",          label: "Status",          type: "select" },
  showInvoiceStatus:   { key: "status",          label: "Invoice Status",  type: "select" },
  showMethod:          { key: "method",          label: "Method",          type: "select" },
  showCategory:        { key: "category",        label: "Category",        type: "select", creatable: true },
  showCategoryText:    { key: "category",        label: "Category",        type: "text",   placeholder: "Filter by category" },
  showOutflowType:     { key: "type",            label: "Type",            type: "select" },
  showPaymentTerm:     { key: "paymentTerm",     label: "Payment Term",    type: "select" },
  showCustomerType:    { key: "customerType",    label: "Customer Type",   type: "select" },
  showStockStatus:     { key: "status",          label: "Stock Status",    type: "select" },
};
