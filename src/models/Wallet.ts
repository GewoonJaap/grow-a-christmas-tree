import { model, Schema } from "mongoose";

interface IWallet {
  coins: number;
}

const WalletSchema = new Schema<IWallet>({
  coins: { type: Number, required: true, default: 0 }
});

const Wallet = model<IWallet>("Wallet", WalletSchema);

export { Wallet, WalletSchema, IWallet };
