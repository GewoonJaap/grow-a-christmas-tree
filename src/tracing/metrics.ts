import { metrics } from "@opentelemetry/api";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";

// Common resource attributes
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME
});

// Metric exporter setup
const metricExporterOptions = {
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`
};
const metricExporter = new OTLPMetricExporter(metricExporterOptions);
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10000 // Set to 10 seconds for demonstrative purposes only
});

// Metrics setup
const meterProvider = new MeterProvider({
  resource: resource,
  readers: [metricReader]
});

metrics.setGlobalMeterProvider(meterProvider);

const meter = metrics.getMeter(process.env.OTEL_SERVICE_NAME ?? "christmas-tree-bot");

export class Metrics {
  static recordCommandMetric(commandName: string, userId: string, guildId?: string): void {
    const commandMetric = meter.createCounter("command_executions", {
      description: "Counts the number of times a command is executed"
    });

    commandMetric.add(1, { command: commandName, user: userId, guild: guildId ?? "unknown" });
  }

  static recordShopPurchaseMetric(itemName: string, userId: string, guildId?: string): void {
    const shopPurchaseMetric = meter.createCounter("shop_purchases", {
      description: "Counts the number of shop purchases"
    });

    shopPurchaseMetric.add(1, { item: itemName, user: userId, guild: guildId ?? "unknown" });
  }

  static recordBoosterPurchaseMetric(boosterName: string, userId: string, guildId?: string): void {
    const boosterPurchaseMetric = meter.createCounter("booster_purchases", {
      description: "Counts the number of booster purchases"
    });

    boosterPurchaseMetric.add(1, { booster: boosterName, user: userId, guild: guildId ?? "unknown" });
  }

  static recordComposterUpgradeMetric(
    userId: string,
    guildId: string,
    upgradeType: string,
    upgradeLevel: number
  ): void {
    const composterUpgradeMetric = meter.createCounter("composter_upgrades", {
      description: "Counts the number of composter upgrades"
    });

    composterUpgradeMetric.add(1, { user: userId, guild: guildId, upgradeType, upgradeLevel });
  }

  static recordSendCoinsMetric(senderId: string, recipientId: string, amount: number): void {
    const sendCoinsMetric = meter.createCounter("coins_sent", {
      description: "Counts the number of coins sent"
    });

    sendCoinsMetric.add(1, { sender: senderId, recipient: recipientId, amount });
  }

  static recordMinigameWinMetric(userId: string, minigameName: string): void {
    const minigameWinMetric = meter.createCounter("minigame_wins", {
      description: "Counts the number of minigame wins"
    });

    minigameWinMetric.add(1, { user: userId, minigame: minigameName });
  }

  static recordMinigameLossMetric(userId: string, minigameName: string): void {
    const minigameLossMetric = meter.createCounter("minigame_losses", {
      description: "Counts the number of minigame losses"
    });

    minigameLossMetric.add(1, { user: userId, minigame: minigameName });
  }

  static recordCosmeticPurchaseMetric(itemName: string, userId: string, guildId?: string): void {
    const cosmeticPurchaseMetric = meter.createCounter("cosmetic_purchases", {
      description: "Counts the number of cosmetic purchases"
    });

    cosmeticPurchaseMetric.add(1, { item: itemName, user: userId, guild: guildId ?? "unknown" });
  }

  static recordWheelSpinMetric(userId: string, guildId: string, rewardType: string, rewardAmount: number): void {
    const wheelSpinMetric = meter.createCounter("wheel_spins", {
      description: "Counts the number of wheel spins"
    });

    wheelSpinMetric.add(1, { user: userId, guild: guildId, rewardType: rewardType, rewardAmount: rewardAmount });
  }

  static recordAdventCalendarWinMetric(userId: string, rewardDetails: string): void {
    const adventCalendarWinMetric = meter.createCounter("advent_calendar_wins", {
      description: "Counts the number of advent calendar wins"
    });

    adventCalendarWinMetric.add(1, { user: userId, reward: rewardDetails });
  }

  static recordMongooseOperationMetric(operation: string, duration: number): void {
    const mongooseOperationMetric = meter.createHistogram("mongoose_operations", {
      description: "Records the duration of Mongoose operations"
    });

    mongooseOperationMetric.record(duration, { operation });
  }
}
