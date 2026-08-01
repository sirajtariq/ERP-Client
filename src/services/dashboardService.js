import { dashboardCards, recentTransactions } from "@/mock";
import { delay } from "./api";

export const dashboardService = {
  getCards: async () => {
    await delay();
    return [...dashboardCards];
  },

  getRecentTransactions: async () => {
    await delay();
    return [...recentTransactions];
  },
};
