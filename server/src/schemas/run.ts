/**
 * Validation schema for POST /api/run.
 *
 * zod is the single validation boundary between untrusted client input and the
 * backend. The API key is required (API mode is key-per-request) but is never
 * logged or echoed back.
 */
import { z } from "zod";
import { PROVIDER_NAMES } from "../types/index.js";

export const runRequestSchema = z.object({
  goal: z.string().trim().min(1, "goal is required").max(20_000),
  provider: z.enum(
    PROVIDER_NAMES as unknown as [string, ...string[]],
    // Narrowed to ProviderName by the enum membership above.
  ),
  apiKey: z.string().trim().min(1, "apiKey is required"),
  agentSlug: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
});

export type RunRequest = z.infer<typeof runRequestSchema>;
