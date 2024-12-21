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

    wheelSpinMetric.add(1, { user: userId, guild: guildId, rewardType, rewardAmount });
  }

  static recordAdventCalendarWinMetric(userId: string, rewardDetails: string): void {
    const adventCalendarWinMetric = meter.createCounter("advent_calendar_wins", {
      description: "Counts the number of advent calendar wins"
    });

    adventCalendarWinMetric.add(1, { user: userId, reward: rewardDetails });
  }
}
