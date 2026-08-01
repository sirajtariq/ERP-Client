import { transactionsMock } from "@/mock";
import { delay } from "./api";

let transactions = [...transactionsMock];

export const transactionService = {
  getAll: async () => {
    await delay();
    return [...transactions];
  },

  getByPartyId: async (partyId) => {
    await delay();
    return transactions.filter((t) => t.partyId === partyId);
  },

  create: async (data) => {
    await delay();
    const newTransaction = {
      ...data,
      id: Date.now(),
      date: data.date || new Date().toISOString().split("T")[0],
    };
    transactions.push(newTransaction);
    return newTransaction;
  },

  update: async (id, data) => {
    await delay();
    const index = transactions.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("Transaction not found");
    transactions[index] = { ...transactions[index], ...data };
    return transactions[index];
  },

  delete: async (id) => {
    await delay();
    transactions = transactions.filter((t) => t.id !== id);
    return true;
  },
};
