import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { McpUiRoot } from "./mcp-ui/McpUiRoot.js";

function unwrapStructuredContent(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "view" in raw) {
    return (raw as { view: unknown }).view;
  }
  return raw;
}

function firstTextBlock(
  content: { type: string; text?: string }[] | undefined,
): string {
  if (!content?.length) {
    return "Tool error";
  }
  const t = content.find((c) => c.type === "text" && typeof c.text === "string");
  return t?.text ?? JSON.stringify(content);
}

function Shell() {
  const [data, setData] = useState<{
    view: unknown;
    error?: string;
  } | null>(null);

  const { isConnected, error } = useApp({
    appInfo: { name: "scriptiz-mcp-widget", version: "0.1.3" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.isError === true) {
          setData({
            view: null,
            error: firstTextBlock(result.content),
          });
          return;
        }
        const raw = result.structuredContent;
        setData({
          view: unwrapStructuredContent(raw),
          error: undefined,
        });
      };
    },
  });

  if (error) {
    return (
      <div className="text-destructive p-4 text-sm">
        MCP Apps bridge error: {error.message}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-muted-foreground p-4 text-sm">Connecting…</div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      {data?.error ? (
        <div
          className="text-destructive p-4 text-sm whitespace-pre-wrap"
          role="alert"
        >
          {data.error}
        </div>
      ) : null}
      {data?.view != null ? (
        <McpUiRoot
          data={data.view}
          onTranscriptAction={(a, c) => {
            console.info("[Scriptiz widget]", a, c);
          }}
        />
      ) : !data?.error ? (
        <div className="text-muted-foreground p-4 text-sm">
          Run a Scriptiz tool to render results here.
        </div>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Shell />);
