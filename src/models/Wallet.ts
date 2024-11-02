import { model, Schema } from "mongoose";

interface IWallet {
  playerId: string;
  coins: number;
}

const WalletSchema = new Schema<IWallet>({
  playerId: { type: String, required: true, unique: true },
  coins: { type: Number, required: true, default: 0 }
});

const Wallet = model<IWallet>("Wallet", WalletSchema);

export { Wallet, WalletSchema, IWallet };
