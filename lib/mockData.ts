export interface UserProfile {
    monthlyIncome: number;
    currentBalance: number;
    activeGoal: string;
}

export interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: "Fixed" | "Variable" | "Impulse";
}

export const mockUserProfile: UserProfile = {
    monthlyIncome: 5000,
    currentBalance: 1200,
    activeGoal: "Save $1000 for an emergency fund by December"
};

export const mockTransactions: Transaction[] = [
    { id: "1", date: "2026-03-01", description: "Rent", amount: -1500, category: "Fixed" },
    { id: "2", date: "2026-03-01", description: "Electricity Bill", amount: -120, category: "Fixed" },
    { id: "3", date: "2026-03-02", description: "Internet", amount: -70, category: "Fixed" },
    { id: "4", date: "2026-02-28", description: "Groceries", amount: -150, category: "Variable" },
    { id: "5", date: "2026-02-26", description: "Dining Out", amount: -85, category: "Variable" },
    { id: "6", date: "2026-02-24", description: "Gas", amount: -45, category: "Variable" },
    { id: "7", date: "2026-02-20", description: "Groceries", amount: -180, category: "Variable" },
    { id: "8", date: "2026-02-18", description: "New Headphones", amount: -350, category: "Impulse" },
    { id: "9", date: "2026-02-15", description: "Coffee Shop", amount: -12, category: "Variable" },
    { id: "10", date: "2026-02-14", description: "Valentine's Dinner", amount: -120, category: "Variable" },
    { id: "11", date: "2026-02-10", description: "Gym Membership", amount: -50, category: "Fixed" },
    { id: "12", date: "2026-02-05", description: "Video Game", amount: -70, category: "Impulse" },
    { id: "13", date: "2026-02-02", description: "Water Bill", amount: -60, category: "Fixed" },
];

export function getFinancialData() {
    return {
        profile: mockUserProfile,
        transactions: mockTransactions
    };
}
