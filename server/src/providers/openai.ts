/**
 * OpenAI provider adapter.
 *
 * Streams chat completions and normalises them to {@link ProviderStreamEvent}s.
 * The API key arrives per-request (never from disk) and is used only to build a
 * client for that call. Errors are mapped to human-readable, retryable-flagged
 * events — raw SDK errors never leave this module.
 */
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ProviderAdapter, ProviderStreamEvent } from "./types.js";

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

/**
 * Map an unknown error thrown by the OpenAI SDK (or the network) to a stable,
 * user-facing shape. Structural checks (not `instanceof`) keep this pure and
 * unit-testable without constructing SDK error instances.
 */
export function mapOpenAiError(err: unknown): {
  message: string;
  retryable: boolean;
} {
  const e = err as { status?: number; code?: string; name?: string; message?: string };

  if (typeof e?.status === "number") {
    const status = e.status;
    if (status === 401 || status === 403) {
      return {
        message: "OpenAI authentication failed — check your API key.",
        retryable: false,
      };
    }
    if (status === 429) {
      return {
        message: "OpenAI rate limit reached — please retry shortly.",
        retryable: true,
      };
    }
    if (status >= 500) {
      return { message: "OpenAI service error — please retry.", retryable: true };
    }
    if (status >= 400) {
      return {
        message: `OpenAI rejected the request: ${e.message ?? "bad request"}`,
        retryable: false,
      };
    }
  }

  if (
    e?.name === "APIConnectionTimeoutError" ||
    e?.code === "ETIMEDOUT" ||
    e?.code === "ESOCKETTIMEDOUT"
  ) {
    return { message: "OpenAI request timed out — please retry.", retryable: true };
  }

  if (
    e?.name === "APIConnectionError" ||
    e?.code === "ECONNREFUSED" ||
    e?.code === "ENOTFOUND"
  ) {
    return { message: "Could not reach OpenAI — check your connection.", retryable: true };
  }

  return {
    message: e?.message ?? "Unexpected OpenAI error.",
    retryable: false,
  };
}

export const openaiAdapter: ProviderAdapter = {
  name: "openai",
  defaultModel: DEFAULT_OPENAI_MODEL,

  async *run(input): AsyncIterable<ProviderStreamEvent> {
    if (!input.apiKey) {
      yield { type: "error", message: "Missing OpenAI API key.", retryable: false };
      return;
    }

    const client = new OpenAI({ apiKey: input.apiKey });

    const messages: ChatCompletionMessageParam[] = [];
    if (input.systemPrompt) {
      messages.push({ role: "system", content: input.systemPrompt });
    }
    messages.push({ role: "user", content: input.goal });

    try {
      const stream = await client.chat.completions.create(
        {
          model: input.model ?? DEFAULT_OPENAI_MODEL,
          messages,
          stream: true,
        },
        input.signal ? { signal: input.signal } : undefined,
      );

      let finishReason: string | undefined;
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        const delta = choice?.delta?.content;
        if (delta) yield { type: "token", content: delta };
        if (choice?.finish_reason) finishReason = choice.finish_reason;
      }

      yield { type: "done", finishReason };
    } catch (err) {
      const { message, retryable } = mapOpenAiError(err);
      yield { type: "error", message, retryable };
    }
  },
};
