import {
  jobStatusViewSchema,
  listViewSchema,
  videoTranscriptViewSchema,
} from "@scriptiz/mcp-tools/ui";
import { z } from "zod";

const mcpUiViewUnion = z.discriminatedUnion("type", [
  videoTranscriptViewSchema,
  listViewSchema,
  jobStatusViewSchema,
]);

export type McpUiViewPayload = z.infer<typeof mcpUiViewUnion>;

export function parseMcpUiPayload(
  data: unknown,
):
  | { ok: true; payload: McpUiViewPayload }
  | { ok: false; error: string; issues?: string } {
  const r = mcpUiViewUnion.safeParse(data);
  if (r.success) {
    return { ok: true, payload: r.data };
  }
  return {
    ok: false,
    error: "Invalid MCP UI payload",
    issues: r.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; "),
  };
}
