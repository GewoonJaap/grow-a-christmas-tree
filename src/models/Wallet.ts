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
  lastClaimDate: { type: Date, required: true, default: new Date("1999-01-01T00:00:00Z") }
});

const Wallet = model<IWallet>("Wallet", WalletSchema);

export { Wallet, WalletSchema, IWallet };
