export type ErrorCategory = 'AUTH_ERROR' | 'RATE_LIMIT_ERROR' | 'SAFETY_BLOCK' | 'TIMEOUT_ERROR' | 'UNKNOWN';

export interface ErrorDetails {
  agentSlug: string;
  category: ErrorCategory;
  message: string;
  isRetryable: boolean;
  timestamp: string;
}

export class AgentError extends Error {
  public details: ErrorDetails;

  constructor(agentSlug: string, category: ErrorCategory, rawError: any, isRetryable: boolean = false) {
    const rawMessage = rawError?.message || String(rawError);
    const friendlyMessage = AgentError.getFriendlyMessage(category, rawMessage);
    
    super(`[${agentSlug}] ${friendlyMessage}`);
    this.name = 'AgentError';
    
    this.details = {
      agentSlug,
      category,
      message: friendlyMessage,
      isRetryable,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper to map developer stack traces to gorgeous, friendly user alerts.
   */
  private static getFriendlyMessage(category: ErrorCategory, rawMessage: string): string {
    switch (category) {
      case 'AUTH_ERROR':
        return 'API Key authentication failed. Please double-check your credentials in Settings.';
      case 'RATE_LIMIT_ERROR':
        return 'Rate limit exceeded. Too many parallel requests. Retrying with exponential backoff...';
      case 'SAFETY_BLOCK':
        return 'The prompt or output was flagged and blocked by the model safety filters.';
      case 'TIMEOUT_ERROR':
        return 'Connection timed out. The server took too long to respond. Please check your network.';
      default:
        return `Execution encountered an unexpected issue: ${rawMessage}`;
    }
  }

  /**
   * Classifies any thrown error into Swarm's standardized error categories.
   */
  public static classify(err: any): { category: ErrorCategory; isRetryable: boolean } {
    const rawMsg = err?.message || (typeof err === 'string' ? err : '');
    const msg = rawMsg.toLowerCase();

    if (msg.includes('api_key') || msg.includes('authentication') || msg.includes('invalid key') || msg.includes('401')) {
      return { category: 'AUTH_ERROR', isRetryable: false };
    }

    if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429') || msg.includes('quota exceeded')) {
      return { category: 'RATE_LIMIT_ERROR', isRetryable: true };
    }

    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('flagged') || msg.includes('finishreason: safety')) {
      return { category: 'SAFETY_BLOCK', isRetryable: false };
    }

    if (msg.includes('timeout') || msg.includes('deadline') || msg.includes('abort') || msg.includes('etimedout')) {
      return { category: 'TIMEOUT_ERROR', isRetryable: true };
    }

    return { category: 'UNKNOWN', isRetryable: false };
  }
}

/**
 * Wraps agent executions in a try-catch-retry flow.
 * Handles transient retries automatically with exponential backoff.
 */
export async function executeAgentWithRecovery(
  agentSlug: string,
  executeTask: () => Promise<string>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    onRetry?: (slug: string, attempt: number, error: string) => void;
    onFailure?: (slug: string, errorDetails: ErrorDetails) => void;
  } = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelayMs ?? 1000;
  
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Attempt task execution
      return await executeTask();
    } catch (err: any) {
      attempt++;
      const { category, isRetryable } = AgentError.classify(err);
      
      const agentError = new AgentError(agentSlug, category, err, isRetryable && attempt < maxRetries);

      // If error is transient (e.g. rate limits, timeouts) and we have retries left, trigger backoff
      if (isRetryable && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        if (options.onRetry) {
          options.onRetry(agentSlug, attempt, agentError.details.message);
        }
        console.warn(`[ErrorRecovery] Transient error in ${agentSlug} (Attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Fatal error or reached max retries
      if (options.onFailure) {
        options.onFailure(agentSlug, agentError.details);
      }
      throw agentError;
    }
  }

  throw new Error(`[ErrorRecovery] Failed to execute ${agentSlug} after ${maxRetries} attempts.`);
}
