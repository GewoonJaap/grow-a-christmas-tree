import { trace, SpanStatusCode } from "@opentelemetry/api";

// Manual tracing example
const tracer = trace.getTracer("your-service-name");

export async function yourFunction() {
  return tracer.startActiveSpan("your-span-name", async (span) => {
    try {
      // Start a new active span named 'your-span-name'
      span.addEvent("Event description"); // Add an event with a description to the span
      span.setAttribute("attributeKey", "attributeValue"); // Set an attribute on the span
      span.setStatus({ code: SpanStatusCode.OK }); // Set the status of the span to OK
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message }); // Set the status to ERROR if an exception occurs
      span.recordException(error as Error); // Record the exception in the span
      throw error;
    } finally {
      span.end(); // End the span
    }
  });
}
