import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import {
  sampleJobPayload,
  sampleListPayload,
  sampleVideoTranscriptPayload,
} from "./demo/sample-payloads.js";
import { McpUiRoot } from "./mcp-ui/McpUiRoot.js";

const samples = {
  video: sampleVideoTranscriptPayload,
  list: sampleListPayload,
  job: sampleJobPayload,
} as const;

type SampleKey = keyof typeof samples;

export default function App() {
  const [tab, setTab] = useState<SampleKey | "json">("video");
  const [jsonText, setJsonText] = useState(
    () => JSON.stringify(sampleVideoTranscriptPayload, null, 2),
  );
  /** `null`: JSON 모드에서 아직 &quot;파싱&quot; 전 */
  const [jsonPayload, setJsonPayload] = useState<unknown | null>(null);
  const [jsonParseErr, setJsonParseErr] = useState<string | null>(null);

  const data = useMemo(() => {
    if (tab !== "json") {
      return samples[tab];
    }
    if (jsonPayload != null) {
      return jsonPayload;
    }
    return null;
  }, [tab, jsonPayload]);

  const applyJson = () => {
    setJsonParseErr(null);
    try {
      setJsonPayload(JSON.parse(jsonText) as unknown);
    } catch (e) {
      setJsonPayload(null);
      setJsonParseErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="bg-card/80 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-sm font-medium">Scriptiz MCP UI</h1>
            <p className="text-xs text-muted-foreground">
              MCP 도구 JSON({`type`} 구분) · {`video_transcript_view`} · {`list_view`}{" "}
              · {`job_status_view`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["video", "list", "job"] as const).map((k) => (
              <Button
                key={k}
                onClick={() => {
                  setTab(k);
                }}
                size="sm"
                type="button"
                variant={tab === k ? "default" : "outline"}
              >
                {k === "video" ? "영상+자막" : k === "list" ? "리스트" : "Job"}
              </Button>
            ))}
            <Button
              onClick={() => {
                setTab("json");
              }}
              size="sm"
              type="button"
              variant={tab === "json" ? "default" : "outline"}
            >
              JSON
            </Button>
          </div>
        </div>
      </header>

      {tab === "json" ? (
        <div className="bg-muted/30 border-b px-4 py-3">
          <div className="mx-auto max-w-5xl space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={applyJson} size="sm" type="button">
                파싱하여 렌더
              </Button>
              <Button
                onClick={() => {
                  setJsonText(JSON.stringify(samples.video, null, 2));
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                샘플(영상) 넣기
              </Button>
            </div>
            <textarea
              className="bg-background min-h-48 w-full rounded-md border p-3 font-mono text-xs"
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              value={jsonText}
            />
            {jsonParseErr ? (
              <p className="text-destructive text-xs">{jsonParseErr}</p>
            ) : null}
            {jsonPayload == null && !jsonParseErr ? (
              <p className="text-xs text-muted-foreground">
                MCP 응답 JSON을 붙인 뒤 &quot;파싱하여 렌더&quot;를 누르면 아래에 뷰가
                열립니다.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <main>
        {data != null ? (
          <McpUiRoot
            data={data}
            onTranscriptAction={(a, c) => {
              console.info("[MCP UI action]", a, c);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
