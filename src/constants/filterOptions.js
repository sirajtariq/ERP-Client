// Shared dropdown options for table filter panels.
// Kept in one place so filter values stay consistent with what each table already renders as a Tag.

export const SALE_PAYMENT_STATUS_OPTIONS = [
  { label: "Paid", value: "Paid" },
  { label: "Unpaid", value: "Unpaid" },
  { label: "Partial", value: "Partial" },
];

export const PURCHASE_PAYMENT_STATUS_OPTIONS = [
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Partial", value: "partial" },
];

// Matches Quotation.status enum in the backend.
export const QUOTATION_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Converted", value: "converted" },
];

// Matches Quotation.payment_term enum in the backend (lowercase — distinct from
// PurchaseInvoice.paymentTerm below, which uses capitalized values).
export const QUOTATION_PAYMENT_TERM_OPTIONS = [
  { label: "Cash", value: "cash" },
  { label: "Credit", value: "credit" },
];

// Matches PurchaseInvoice.status enum in the backend (Draft/Saved) — the real
// `status` query param on GET /purchase/invoices/. Distinct from paymentStatus
// (Paid/Unpaid/Partial), which is NOT filterable on that endpoint.
export const PURCHASE_INVOICE_STATUS_OPTIONS = [
  { label: "Draft", value: "Draft" },
  { label: "Saved", value: "Saved" },
];

// Matches PurchaseInvoice.paymentTerm enum in the backend.
export const PAYMENT_TERM_OPTIONS = [
  { label: "Cash", value: "Cash" },
  { label: "Credit", value: "Credit" },
];

// Matches the `type` query param on GET /sales/customers/.
export const CUSTOMER_TYPE_OPTIONS = [
  { label: "Permanent", value: "permanent" },
  { label: "Walkin", value: "walkin" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { label: "Cash", value: "Cash" },
  { label: "Bank Transfer", value: "Bank Transfer" },
  { label: "JazzCash", value: "JazzCash" },
  { label: "EasyPaisa", value: "EasyPaisa" },
  { label: "Cheque", value: "Cheque" },
];

// The backend's Expense.category is a plain free-text string (no fixed enum, no
// categories endpoint) — this list is frontend-only, for quick/consistent selection.
export const EXPENSE_CATEGORY_OPTIONS = [
  { label: "Add Other", value: "other" },
  { label: "Rent", value: "rent" },
  { label: "Electricity Bill", value: "electricity_bill" },
  { label: "Gas Bill", value: "gas_bill" },
  { label: "Water Bill", value: "water_bill" },
  { label: "Telephone / Internet", value: "telephone_internet" },
  { label: "Salaries & Wages", value: "salaries_wages" },
  { label: "Staff Advance", value: "staff_advance" },
  { label: "Customer Refreshment", value: "customer_refreshment" },
  { label: "Tea / Food", value: "tea_food" },
  { label: "Transport / Fuel", value: "transport_fuel" },
  { label: "Office Supplies / Stationery", value: "office_supplies_stationery" },
  { label: "Repair & Maintenance", value: "repair_maintenance" },
  { label: "Material Advance", value: "material_advance" },
  { label: "Marketing & Advertising", value: "marketing_advertising" },
  { label: "Bank Charges", value: "bank_charges" },
  { label: "Legal & Professional Fees", value: "legal_professional_fees" },
];
