import type { McpUiViewPayload } from "./parse-payload.js";
import { parseMcpUiPayload } from "./parse-payload.js";
import { JobStatusViewPanel } from "./JobStatusViewPanel.js";
import { ListViewPanel } from "./ListViewPanel.js";
import { VideoTranscriptViewPanel } from "./VideoTranscriptViewPanel.js";
import type { GenericToolView } from "@scriptiz/mcp-tools/ui";

type Props = {
  data: unknown;
  onTranscriptAction?: Parameters<
    typeof VideoTranscriptViewPanel
  >[0]["onAction"];
};

function McpUiViewInner({
  v,
  onTranscriptAction,
}: {
  v: McpUiViewPayload;
  onTranscriptAction?: Props["onTranscriptAction"];
}) {
  if (v.type === "video_transcript_view") {
    return (
      <VideoTranscriptViewPanel onAction={onTranscriptAction} v={v} />
    );
  }
  if (v.type === "list_view") {
    return <ListViewPanel v={v} />;
  }
  if (v.type === "job_status_view") {
    return <JobStatusViewPanel v={v} />;
  }
  if (v.type === "generic_tool_view") {
    return <GenericToolPanel v={v} />;
  }
  const _exhaustive: never = v;
  return _exhaustive;
}

function GenericToolPanel({ v }: { v: GenericToolView }) {
  return (
    <div className="text-foreground space-y-2 p-4">
      <h2 className="text-sm font-medium tracking-tight">{v.tool}</h2>
      <pre className="bg-muted/40 border-border max-h-[min(70vh,520px)] overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
        {JSON.stringify(v.payload, null, 2)}
      </pre>
    </div>
  );
}

export function McpUiRoot({ data, onTranscriptAction }: Props) {
  const parsed = parseMcpUiPayload(data);
  if (!parsed.ok) {
    return (
      <div className="text-destructive space-y-2 p-4 text-sm" role="alert">
        <p className="font-medium">{parsed.error}</p>
        {parsed.issues ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-xs opacity-90">
            {parsed.issues}
          </pre>
        ) : null}
      </div>
    );
  }
  return (
    <McpUiViewInner
      onTranscriptAction={onTranscriptAction}
      v={parsed.payload}
    />
  );
}
