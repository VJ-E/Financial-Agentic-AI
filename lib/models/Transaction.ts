import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
    userId: string;
    date: Date;
    description: string;
    amount: number;
    category: 'Fixed' | 'Variable' | 'Income';
}

const TransactionSchema = new Schema<ITransaction>({
    userId: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
        type: String,
        enum: ['Fixed', 'Variable', 'Income'],
        required: true
    }
}, { timestamps: true });

// Prevent model recompilation errors in Next.js development
const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
