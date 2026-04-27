import type { McpUiViewPayload } from "./parse-payload.js";
import { parseMcpUiPayload } from "./parse-payload.js";
import { JobStatusViewPanel } from "./JobStatusViewPanel.js";
import { ListViewPanel } from "./ListViewPanel.js";
import { VideoTranscriptViewPanel } from "./VideoTranscriptViewPanel.js";

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
  return <JobStatusViewPanel v={v} />;
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
