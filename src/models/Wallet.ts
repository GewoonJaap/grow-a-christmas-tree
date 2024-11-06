import { model, Schema } from "mongoose";

interface IWallet {
  coins: number;
  userId: string;
  streak: number;
  lastClaimDate: Date;
}

const WalletSchema = new Schema<IWallet>({
  coins: { type: Number, required: true, default: 0 },
  userId: { type: String, required: true, unique: true, index: true },
  streak: { type: Number, required: true, default: 0 },
  lastClaimDate: { type: Date, required: false }
});

const Wallet = model<IWallet>("Wallet", WalletSchema);

export { Wallet, WalletSchema, IWallet };
