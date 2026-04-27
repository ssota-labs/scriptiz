/**
 * MCP Apps (Model Context Protocol Apps) — tool + `ui://` resource wiring.
 * @see https://modelcontextprotocol.io/extensions/apps/overview
 * @see https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt
 */

/** Single HTML app entry; hosts preload it from `resources/read` when a tool declares `_meta.ui.resourceUri`. */
export const SCRIPTIZ_MCP_APP_RESOURCE_URI = "ui://scriptiz/app" as const;

/**
 * Tool metadata so MCP Apps–capable hosts (ChatGPT, Claude, Copilot, …) can load the iframe UI.
 * Optional ChatGPT alias: `_meta["openai/outputTemplate"]` (same URI string).
 */
export const SCRIPTIZ_MCP_APP_TOOL_META: Record<string, unknown> = {
  ui: {
    resourceUri: SCRIPTIZ_MCP_APP_RESOURCE_URI,
  },
  "openai/outputTemplate": SCRIPTIZ_MCP_APP_RESOURCE_URI,
};
