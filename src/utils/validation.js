// =============================================
// React Hook Form Schemas (Controller pattern)
// =============================================

// Customer
export const customerFormSchema = {
  name:          { required: "Customer name is required" },
  phone:         {},
  email:         {},
  address:       {},
  taxNumber:     {},
  openingCredit: {},
  openingNote:   {},
};

// Supplier / Vendor
export const supplierLedgerSchema = {
  vendorName:     { required: "Vendor name is required" },
  phone:          {},
  email:          {},
  address:        {},
  taxNumber:      {},
  openingPayable: {},
  openingNote:    {},
};

// Invoice (Sale / Purchase)
export const invoiceCustomerSchema = {
  code: {},
  phone: {},
  invoiceNo: {},
  taxNumber: {},
  creditBalance: {},
  advanceBalance: {},
};

// Quotation
export const quotationFormSchema = {
  validDays: {},
  paymentTerms: {},
  vatPercent: {},
  discount: {},
};

// Daily Expense
export const expenseFormSchema = {
  category: { required: "Category is required" },
  person: {},
  paidBy: {},
  description: {},
};

// Daily Receive
export const receiveFormSchema = {
  amount: { required: "Amount is required", min: { value: 1, message: "Amount must be greater than 0" } },
  method: { required: "Method is required" },
  notes: {},
};

// =============================================
// Legacy antd Form schemas (backward compat)
// =============================================

export const customerSchema = {
  name: [
    { required: true, message: "Customer name is required" },
    { min: 2, message: "Name must be at least 2 characters" },
  ],
  phone: [
    { required: true, message: "Phone number is required" },
    { pattern: /^[0-9\-+() ]{7,15}$/, message: "Enter a valid phone number" },
  ],
  email: [
    { type: "email", message: "Enter a valid email address" },
  ],
  address: [],
  openingCredit: [
    { required: true, message: "Opening credit is required" },
  ],
  openingNote: [],
};

// =============================================
// Utility functions
// =============================================

export const isFormValid = (values, schema) => {
  for (const field of Object.keys(schema)) {
    const rules = schema[field];
    for (const rule of rules) {
      if (rule.required && !values[field] && values[field] !== 0) {
        return false;
      }
    }
  }
  return true;
};

export const isQuotationStep1Valid = (selectedCustomer, newCustomerName, isNewCustomer) => {
  if (isNewCustomer) return newCustomerName && newCustomerName.trim().length > 0;
  return !!selectedCustomer;
};

export const isQuotationStep2Valid = (items) => {
  if (!items || items.length === 0) return false;
  return items.some((item) => item.name && item.name.trim().length > 0);
};
