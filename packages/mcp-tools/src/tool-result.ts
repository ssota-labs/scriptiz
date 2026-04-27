export type ToolErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};

export function toolErr(
  code: string,
  message: string,
  retryable = false,
  details?: Record<string, unknown>,
): ToolErrorBody {
  return {
    ok: false,
    error: { code, message, retryable, ...(details ? { details } : {}) },
  };
}

export function toolOk<T extends Record<string, unknown>>(payload: T) {
  return payload;
}
