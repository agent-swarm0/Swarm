/**
 * ID generation helpers. Uses the platform crypto so we add no dependency.
 */
import { randomUUID } from "node:crypto";

/** Generates a unique request/run identifier, e.g. "req_a1b2c3d4...". */
export function newRequestId(): string {
  return `req_${randomUUID()}`;
}
