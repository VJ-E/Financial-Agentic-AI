import connectDB from '../lib/db';
import UserProfile from '../lib/models/UserProfile';
import Transaction from '../lib/models/Transaction';
import { addTransaction, createGoal, fundGoal } from '../lib/financialTools';

const MOCK_USER_ID = "user_123";

async function seed() {
    console.log("Connecting to Database...");
    await connectDB();
    console.log("Connected.");

    console.log("Purging existing data for", MOCK_USER_ID);
    await UserProfile.deleteMany({ userId: MOCK_USER_ID });
    await Transaction.deleteMany({ userId: MOCK_USER_ID });

    // Helper to generate dates spanning over the last few months
    const today = new Date();

    console.log("Seeding Transactions...");

    // Month exactly 3 months ago
    const m1 = new Date();
    m1.setMonth(today.getMonth() - 3);

    // Month 2 months ago
    const m2 = new Date();
    m2.setMonth(today.getMonth() - 2);

    // Last month
    const m3 = new Date();
    m3.setMonth(today.getMonth() - 1);

    // Build realistic monthly routines
    const months = [m1, m2, m3, today];

    for (const date of months) {
        // Income
        const dummyDate = new Date(date);
        dummyDate.setDate(1); // 1st of the month salary

        // Mock Mongoose Date insertion by overriding global Date temporarily
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "TCS Salary", 65000, "Income");

        dummyDate.setDate(5);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "HDFC Rent", 18000, "Fixed");

        dummyDate.setDate(7);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "Jio Fiber + Mobile", 1500, "Fixed");

        dummyDate.setDate(10);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "BESCOM Electricity", 1200, "Fixed");

        // Random variables
        dummyDate.setDate(12);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "Swiggy Delivery", Math.floor(Math.random() * 500) + 300, "Variable");

        dummyDate.setDate(15);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "Uber Auto", Math.floor(Math.random() * 200) + 100, "Variable");

        dummyDate.setDate(20);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "Amazon India (Shopping)", Math.floor(Math.random() * 2000) + 1000, "Variable");

        dummyDate.setDate(22);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "Blinkit Groceries", Math.floor(Math.random() * 800) + 500, "Variable");

        dummyDate.setDate(25);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "Zomato", Math.floor(Math.random() * 400) + 200, "Variable");

        dummyDate.setDate(28);
        Transaction.schema.path('date').default(() => dummyDate);
        await addTransaction(MOCK_USER_ID, "Local Kirana Store", Math.floor(Math.random() * 1000) + 500, "Variable");
    }

    // Restore to normal
    Transaction.schema.path('date').default(() => Date.now());

    // Sprinkle extra income
    await addTransaction(MOCK_USER_ID, "Freelance IT Consultation", 15000, "Income");
    await addTransaction(MOCK_USER_ID, "Upstox Dividends", 2500, "Income");

    console.log("Seeding Savings Vaults...");
    const g1 = await createGoal(MOCK_USER_ID, "Emergency Fund", 100000);
    const g2 = await createGoal(MOCK_USER_ID, "TCS Shares", 50000);
    const g3 = await createGoal(MOCK_USER_ID, "Diwali Shopping", 25000);

    // Fund them
    await fundGoal(MOCK_USER_ID, g1.data.shortId, 25000);
    await fundGoal(MOCK_USER_ID, g2.data.shortId, 15000);
    await fundGoal(MOCK_USER_ID, g3.data.shortId, 5000);

    console.log("Data Seeding Complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error("Error during seed:", err);
    process.exit(1);
});
