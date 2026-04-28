/**
 * MCP Apps (Model Context Protocol Apps) — tool + `ui://` resource wiring.
 * @see https://modelcontextprotocol.io/extensions/apps/overview
 * @see https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt
 */

/** Single HTML app entry; hosts preload it from `resources/read` when a tool declares `_meta.ui.resourceUri`. */
export const SCRIPTIZ_MCP_APP_RESOURCE_URI = "ui://scriptiz/app" as const;

/**
 * Per-tool metadata aligned with OpenAI Apps SDK / kitchen-sink examples (`openai/toolInvocation/*`, `openai/widgetAccessible`).
 */
export function scriptizToolDescriptorMeta(invoking: string, invoked: string): Record<string, unknown> {
  return {
    ui: {
      resourceUri: SCRIPTIZ_MCP_APP_RESOURCE_URI,
    },
    "openai/outputTemplate": SCRIPTIZ_MCP_APP_RESOURCE_URI,
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
    "openai/widgetAccessible": true,
  };
}
