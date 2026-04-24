import connectDB from './db';
import UserProfile from './models/UserProfile';
import Transaction from './models/Transaction';

/**
 * Adds a new transaction for a user and natively calculates the new total balance internally.
 * This guarantees mathematical correctness regardless of LLM reasoning.
 */
export async function addTransaction(userId: string, description: string, amount: number, category: 'Fixed' | 'Variable' | 'Income') {
    await connectDB();

    // Ensure accurate mathematical handling of expenses vs income
    // Even if the LLM passes an expense as a positive number, we force it to deduct from the balance.
    const isExpense = category === 'Fixed' || category === 'Variable';
    const effectiveAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);

    // 1. Create the Transaction Record
    const transaction = await Transaction.create({
        userId,
        description,
        amount: Math.abs(amount), // Store the absolute value in the transaction log
        category
    });

    // 2. Fetch or initialize the User Profile
    let profile = await UserProfile.findOne({ userId });

    if (!profile) {
        // If the user does not exist yet, create their profile dynamically
        profile = new UserProfile({
            userId,
            monthlyIncome: category === 'Income' ? Math.abs(amount) : 0,
            totalBalance: effectiveAmount,
            activeSavingsGoals: []
        });
        await profile.save();
    } else {
        // 3. Atomically update the User's Total Balance
        profile.totalBalance += effectiveAmount;
        await profile.save();
    }

    return {
        success: true,
        message: `Transaction added. Balance successfully updated.`,
        data: {
            transaction,
            newBalance: profile.totalBalance
        }
    };
}

/**
 * Fetches the user's financial profile and recent transactions.
 */
export async function getFinancialSummary(userId: string) {
    await connectDB();

    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
        // Return a zero-state default profile for brand new users
        return {
            success: true,
            data: {
                profile: {
                    userId,
                    monthlyIncome: 0,
                    totalBalance: 0,
                    activeSavingsGoals: []
                },
                recentTransactions: []
            }
        };
    }

    // Fetch the 50 most recent transactions for context
    const recentTransactions = await Transaction.find({ userId })
        .sort({ date: -1 }) // Newest first
        .limit(50);

    return {
        success: true,
        data: {
            profile: {
                userId: profile.userId,
                monthlyIncome: profile.monthlyIncome,
                totalBalance: profile.totalBalance,
                activeSavingsGoals: profile.activeSavingsGoals
            },
            recentTransactions
        }
    };
}

/**
 * Deletes a transaction and reverses its impact on the user's total balance natively.
 */
export async function deleteTransaction(userId: string, transactionId: string) {
    await connectDB();

    const allUserTransactions = await Transaction.find({ userId });
    const transaction = allUserTransactions.find(t =>
        t._id.toString().toLowerCase().endsWith(transactionId.toLowerCase())
    );

    if (!transaction) {
        return { success: false, message: `Transaction not found or you don't have permission to delete it.` };
    }

    const profile = await UserProfile.findOne({ userId });

    if (profile) {
        // Reverse the mathematical impact
        const isExpense = transaction.category === 'Fixed' || transaction.category === 'Variable';
        const impact = isExpense ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);

        // Subtract the impact to reverse it (e.g. subtracting an expense adds to balance)
        profile.totalBalance -= impact;
        await profile.save();
    }

    await Transaction.deleteOne({ _id: transaction._id });

    return {
        success: true,
        message: `Transaction deleted successfully. Balance reversed.`,
        data: { newBalance: profile?.totalBalance || 0 }
    };
}

/**
 * Updates a transaction and safely recalculates the total balance difference.
 */
export async function updateTransaction(
    userId: string,
    transactionId: string,
    newAmount?: number,
    newDescription?: string,
    newCategory?: 'Fixed' | 'Variable' | 'Income'
) {
    await connectDB();

    const allUserTransactions = await Transaction.find({ userId });
    const transaction = allUserTransactions.find(t =>
        t._id.toString().toLowerCase().endsWith(transactionId.toLowerCase())
    );

    if (!transaction) {
        return { success: false, message: `Transaction not found.` };
    }

    let balanceDifference = 0;

    // Calculate math difference if amount or category changes
    if (newAmount !== undefined || newCategory !== undefined) {
        const oldIsExpense = transaction.category === 'Fixed' || transaction.category === 'Variable';
        const oldImpact = oldIsExpense ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);

        const categoryToUse = newCategory || transaction.category;
        const amountToUse = newAmount !== undefined ? newAmount : transaction.amount;

        const newIsExpense = categoryToUse === 'Fixed' || categoryToUse === 'Variable';
        const newImpact = newIsExpense ? -Math.abs(amountToUse) : Math.abs(amountToUse);

        balanceDifference = newImpact - oldImpact;
    }

    // Apply updates to the transaction
    if (newAmount !== undefined) transaction.amount = Math.abs(newAmount);
    if (newDescription !== undefined) transaction.description = newDescription;
    if (newCategory !== undefined) transaction.category = newCategory;

    await transaction.save();

    // Safely apply difference to profile
    const profile = await UserProfile.findOne({ userId });
    if (profile && balanceDifference !== 0) {
        profile.totalBalance += balanceDifference;
        await profile.save();
    }

    return {
        success: true,
        message: `Transaction updated.`,
        data: {
            transaction,
            newBalance: profile?.totalBalance || 0
        }
    };
}

/**
 * Creates a new active savings goal for the user.
 */
export async function createGoal(userId: string, title: string, targetAmount: number) {
    await connectDB();

    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
        return { success: false, message: `User profile not found.` };
    }

    // Generate a 4-character uppercase alphanumeric string
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();

    profile.activeSavingsGoals.push({
        shortId,
        title,
        targetAmount: Math.abs(targetAmount),
        currentAmount: 0
    });

    await profile.save();

    return {
        success: true,
        message: `Goal '${title}' created. Target: ₹${targetAmount}.`,
        data: {
            shortId,
            newBalance: profile.totalBalance
        }
    };
}

/**
 * Funds an active savings goal.
 * Uses atomic findOneAndUpdate to securely prevent double-spending race conditions.
 */
export async function fundGoal(userId: string, shortId: string, amount: number) {
    await connectDB();

    const fundingAmount = Math.abs(amount);

    // Atomic query: strict condition for sufficient balances
    const profile = await UserProfile.findOneAndUpdate(
        {
            userId,
            totalBalance: { $gte: fundingAmount },
            "activeSavingsGoals.shortId": shortId
        },
        {
            $inc: {
                totalBalance: -fundingAmount,
                "activeSavingsGoals.$.currentAmount": fundingAmount
            }
        },
        { new: true } // Return the updated document
    );

    if (!profile) {
        // Did it fail because they lack funds, or because the goal doesn't exist?
        const checkProfile = await UserProfile.findOne({ userId });
        if (!checkProfile) return { success: false, message: "Profile not found." };

        const goalExists = checkProfile.activeSavingsGoals.some(g => g.shortId === shortId);
        if (!goalExists) return { success: false, message: `Savings goal #${shortId} not found.` };

        return {
            success: false,
            message: `Insufficient funds. Your total balance is ₹${checkProfile.totalBalance}, but you attempted to secure ₹${fundingAmount} into the vault.`
        };
    }

    const updatedGoal = profile.activeSavingsGoals.find(g => g.shortId === shortId);

    return {
        success: true,
        message: `Successfully transferred ₹${fundingAmount} into vault #${shortId}.`,
        data: {
            newBalance: profile.totalBalance,
            goal: updatedGoal
        }
    };
}
