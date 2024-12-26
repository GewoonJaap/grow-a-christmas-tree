import { IWheelState, WheelState } from "../../models/WheelState";

export class WheelStateHelper {
  static async getWheelState(userId: string): Promise<InstanceType<typeof WheelState>> {
    const wheelState = await WheelState.findOne({ userId: userId });
    if (!wheelState) {
      return await WheelState.create(WheelStateHelper.getDefaultWheelState(userId));
    }
    return wheelState;
  }

  static getDefaultWheelState(userId: string): IWheelState {
    return { userId: userId, tickets: 0, lastSpinDate: new Date("1999-01-01T00:00:00Z") };
  }

  static async addTickets(userId: string, amount: number) {
    if (amount < 0) {
      amount *= -1;
    }
    const wheelState = await WheelStateHelper.getWheelState(userId);
    wheelState.tickets += amount;
    wheelState.tickets = Math.max(wheelState.tickets, 0);
    wheelState.tickets = Math.min(wheelState.tickets, 5000);
    await wheelState.save();
  }

  static async spinWheel(userId: string): Promise<boolean> {
    const wheelState = await WheelStateHelper.getWheelState(userId);

    if (wheelState.tickets <= 0) {
      return false;
    }

    wheelState.tickets--;
    wheelState.lastSpinDate = new Date();

    await wheelState.save();

    return true;
  }
}
