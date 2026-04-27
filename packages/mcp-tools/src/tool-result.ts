export type ToolErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};

/** 도구 핸들러 공통: 성공 시 객체(플랜 `ok: false` 래핑은 사용하지 않음) */
export type ToolResult = Record<string, unknown> | ToolErrorBody;

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
