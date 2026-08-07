import { saleInvoicesMock } from "./saleInvoices";
import { dailyReceiveMock } from "./dailyReceive";
import { dailyExpenseMock } from "./dailyExpense";
import { supplierPaymentsMock } from "./supplierPayments";
import { suppliersMock } from "./suppliers";
import { customerService } from "./customers";

const totalSales = saleInvoicesMock.reduce((sum, inv) => sum + inv.grandTotal, 0);
const cashSales = saleInvoicesMock
  .filter((inv) => inv.paymentMethod === "cash" && inv.paymentStatus === "paid")
  .reduce((sum, inv) => sum + inv.grandTotal, 0);
const creditSales = saleInvoicesMock
  .filter((inv) => inv.paymentStatus !== "paid")
  .reduce((sum, inv) => sum + inv.balance, 0);
const receivable = customerService.getAll().reduce((sum, c) => sum + c.outstanding, 0);
const outgoingExpense = dailyExpenseMock.reduce((sum, e) => sum + e.amount, 0);
const supplierPayable = suppliersMock.reduce((sum, s) => sum + s.balance, 0);
const supplierPaid = supplierPaymentsMock.reduce((sum, p) => sum + p.amount, 0);
const incomingCash = dailyReceiveMock.reduce((sum, r) => sum + r.amount, 0);
const profit = totalSales - outgoingExpense - supplierPaid;

export const dashboardCards = [
  {
    id: 1,
    title: "Total Sales",
    value: totalSales,
    color: "#7c5cfc",
    gradient: "linear-gradient(135deg, #7c5cfc, #a78bfa)",
  },
  {
    id: 2,
    title: "Cash Sales",
    value: cashSales,
    color: "#22c55e",
    gradient: "linear-gradient(135deg, #22c55e, #4ade80)",
  },
  {
    id: 3,
    title: "Credit Sales",
    value: creditSales,
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
  },
  {
    id: 4,
    title: "Receivable",
    value: receivable,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  },
  {
    id: 5,
    title: "Outgoing Expense",
    value: outgoingExpense,
    color: "#ef4444",
    gradient: "linear-gradient(135deg, #ef4444, #f87171)",
  },
  {
    id: 6,
    title: "Profit",
    value: profit,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #34d399)",
  },
  {
    id: 7,
    title: "Vendor Payable",
    value: supplierPayable,
    color: "#f43f5e",
    gradient: "linear-gradient(135deg, #f43f5e, #fb7185)",
  },
  {
    id: 8,
    title: "Vendor Paid",
    value: supplierPaid,
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4, #22d3ee)",
  },
  {
    id: 9,
    title: "Incoming Cash",
    value: incomingCash,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #c084fc)",
  },
];

export const recentTransactions = [
  ...dailyReceiveMock.map((r) => ({
    id: r.id,
    partyName: r.customerName,
    type: "credit",
    amount: r.amount,
    date: r.date,
    category: "received",
  })),
  ...supplierPaymentsMock.map((p) => ({
    id: p.id,
    partyName: p.supplierName,
    type: "debit",
    amount: p.amount,
    date: p.date,
    category: "payment",
  })),
].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
