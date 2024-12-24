import { trace, SpanStatusCode } from "@opentelemetry/api";
import pino from "pino";

const logger = pino({
  level: "info"
});

export async function validateTreeName(name: string): Promise<boolean> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("validateTreeName", async (span) => {
    try {
      if (name.length > 36) return false;
      if (name.length === 0) return false;
      if (!/^[a-zA-Z0-9\-' ]+$/.test(name)) return false;

      const res = await fetch('https://vector.profanity.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: name + " tree" }),
      });

      if (!res.ok) {
        throw new Error(`Error checking profanity: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.isProfanity) {
        return false;
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return true;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      logger.error(error);
      return false;
    } finally {
      span.end();
    }
  });
}
