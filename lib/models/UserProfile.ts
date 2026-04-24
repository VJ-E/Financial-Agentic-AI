import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserProfile extends Document {
    userId: string;
    monthlyIncome: number;
    totalBalance: number;
    activeSavingsGoals: {
        shortId: string;
        title: string;
        targetAmount: number;
        currentAmount: number;
    }[];
}

const UserProfileSchema = new Schema<IUserProfile>({
    userId: { type: String, required: true, unique: true },
    monthlyIncome: { type: Number, required: true, default: 0 },
    totalBalance: { type: Number, required: true, default: 0 },
    activeSavingsGoals: [
        {
            shortId: { type: String, required: true },
            title: { type: String, required: true },
            targetAmount: { type: Number, required: true },
            currentAmount: { type: Number, default: 0 },
        }
    ]
}, { timestamps: true });

// Prevent model recompilation errors in Next.js development
const UserProfile: Model<IUserProfile> = mongoose.models.UserProfile || mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);

export default UserProfile;
