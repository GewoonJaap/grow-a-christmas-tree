import { WheelState } from "../../models/WheelState";

export class WheelStateHelper {
  static async getWheelState(userId: string): Promise<InstanceType<typeof WheelState>> {
    const wheelState = await WheelState.findOne({ userId: userId });
    if (!wheelState) {
      return await WheelState.create(WheelStateHelper.getDefaultWheelState(userId));
    }
    return wheelState;
  }

  static getDefaultWheelState(userId: string): InstanceType<typeof WheelState> {
    return { userId: userId, tickets: 0, lastSpinDate: new Date("1999-01-01T00:00:00Z"), theme: "default" };
  }

  static async addTickets(userId: string, amount: number) {
    if (amount < 0) {
      amount *= -1;
    }
    const wheelState = await WheelStateHelper.getWheelState(userId);
    wheelState.tickets += amount;
    await wheelState.save();
  }

  static async updateLastSpinDate(userId: string, lastSpinDate: Date) {
    const wheelState = await WheelStateHelper.getWheelState(userId);
    wheelState.lastSpinDate = lastSpinDate;
    await wheelState.save();
  }
}
