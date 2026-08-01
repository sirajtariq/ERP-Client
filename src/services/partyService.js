import { partiesMock } from "@/mock";
import { delay } from "./api";

let parties = [...partiesMock];

export const partyService = {
  getAll: async () => {
    await delay();
    return [...parties];
  },

  getById: async (id) => {
    await delay();
    return parties.find((p) => p.id === id) || null;
  },

  create: async (data) => {
    await delay();
    const newParty = {
      ...data,
      id: Date.now(),
      balance: 0,
      balanceType: "settled",
      createdAt: new Date().toISOString().split("T")[0],
    };
    parties.push(newParty);
    return newParty;
  },

  update: async (id, data) => {
    await delay();
    const index = parties.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Party not found");
    parties[index] = { ...parties[index], ...data };
    return parties[index];
  },

  delete: async (id) => {
    await delay();
    parties = parties.filter((p) => p.id !== id);
    return true;
  },
};
