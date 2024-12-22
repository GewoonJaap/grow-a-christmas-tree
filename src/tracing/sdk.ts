import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { MongooseInstrumentation } from "@opentelemetry/instrumentation-mongoose";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { logger } from "./pinoLogger";

// Common resource attributes
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME
});

// Trace exporter setup
const traceExporterOptions = {
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
};
const traceExporter = new OTLPTraceExporter(traceExporterOptions);

// Metric exporter setup
const metricExporterOptions = {
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`
};
const metricExporter = new OTLPMetricExporter(metricExporterOptions);
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10000 // Set to 10 seconds for demonstrative purposes only
});

// SDK setup
const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
    new MongooseInstrumentation(),
    new UndiciInstrumentation(),
    new PinoInstrumentation()
  ],
  resource: resource
});

// Initialize the SDK and register with the OpenTelemetry API
// This enables the API to record telemetry
try {
  sdk.start();
} catch (_) {
  logger.info("Error starting telemetry");
}

// Gracefully shut down the SDK on process exit
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => logger.info("Telemetry terminated"))
    .catch((error) => logger.info("Error terminating telemetry", error))
    .finally(() => process.exit(0));
});
