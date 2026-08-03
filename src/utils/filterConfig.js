// Per-table filter panel config — flags decide which filter fields render for each table.
// Field keys map to definitions in components/common/FilterPanel/fieldDefinitions.js

export const filterConfig = {
  saleInvoice: {
    showInvoiceNumber: true,
    showStatus: true,
    showStartDate: true,
    showEndDate: true,
  },
  customers: {
    showCustomerType: true,
  },
  purchaseInvoice: {
    showBillNumber: true,
    showInvoiceNumber: true,
    showInvoiceStatus: true,
    showPaymentTerm: true,
  },
  quotation: {
    showStartDate: true,
    showEndDate: true,
    showQuotationNumber: true,
    showStatus: true,
  },
  dailyReceive: {
    showStartDate: true,
    showEndDate: true,
  },
  dailyExpense: {
    showStartDate: true,
    showEndDate: true,
  },
};
