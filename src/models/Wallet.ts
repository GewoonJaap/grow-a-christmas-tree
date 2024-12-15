import { model, Schema } from "mongoose";
import { trace } from "@opentelemetry/api";

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

WalletSchema.pre("save", function (next) {
  const span = trace.getTracer("default").startSpan("Wallet - save");
  span.setAttribute("userId", this.userId);
  span.end();
  next();
});

WalletSchema.pre("find", function (next) {
  const span = trace.getTracer("default").startSpan("Wallet - find");
  span.setAttribute("userId", this.getQuery().userId);
  span.end();
  next();
});

WalletSchema.pre("findOne", function (next) {
  const span = trace.getTracer("default").startSpan("Wallet - findOne");
  span.setAttribute("userId", this.getQuery().userId);
  span.end();
  next();
});

WalletSchema.pre("updateOne", function (next) {
  const span = trace.getTracer("default").startSpan("Wallet - updateOne");
  span.setAttribute("userId", this.getQuery().userId);
  span.end();
  next();
});

const Wallet = model<IWallet>("Wallet", WalletSchema);

export { Wallet, WalletSchema, IWallet };
