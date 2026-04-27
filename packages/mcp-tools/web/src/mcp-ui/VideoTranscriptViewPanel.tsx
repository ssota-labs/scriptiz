import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { McpUiAction, VideoTranscriptView } from "@scriptiz/mcp-tools/ui";
import { useCallback, useState } from "react";
import YouTube, {
  type YouTubeEvent,
  type YouTubePlayer,
} from "react-youtube";
import { formatMsRange } from "./format-time.js";

const actionLabels: Record<McpUiAction, string> = {
  insert_segment_to_chat: "이 구간을 채팅에 넣기",
  insert_range_to_chat: "범위를 채팅에 넣기",
  save_to_list: "리스트에 저장",
};

type Props = {
  v: VideoTranscriptView;
  /** 데모: 액션 클릭 시 (호스트는 채팅/리스트 API로 연결) */
  onAction?: (action: McpUiAction, context?: { segmentIndex?: number }) => void;
};

export function VideoTranscriptViewPanel({ v, onAction }: Props) {
  const { resource, video, transcript } = v;
  const videoId = resource.sourceId;
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);

  const onReady = useCallback((e: YouTubeEvent) => {
    setPlayer(e.target);
  }, []);

  const seekToSegment = (startMs: number) => {
    if (!player) {
      return;
    }
    player.seekTo(startMs / 1000, true);
    void player.playVideo();
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-medium">{resource.title}</h1>
        <p className="text-xs text-muted-foreground">
          {transcript.language.toUpperCase()} · YouTube
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player</CardTitle>
          <CardDescription>
            <a
              className="text-primary underline-offset-2 hover:underline"
              href={video.watchUrl}
              rel="noreferrer"
              target="_blank"
            >
              YouTube에서 열기
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="aspect-video w-full max-w-3xl overflow-hidden rounded-md bg-muted"
          >
            <YouTube
              className="h-full w-full"
              onReady={onReady}
              opts={{
                width: "100%",
                height: "100%",
                playerVars: { rel: 0, modestbranding: 1 },
              }}
              videoId={videoId}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {v.actions.map((a) => (
              <Button
                key={a}
                onClick={() => onAction?.(a)}
                size="sm"
                type="button"
                variant="outline"
              >
                {actionLabels[a]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          {transcript.nextCursor ? (
            <CardDescription>다음 페이지: cursor 있음 (호스트가 로드)</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[min(32rem,55vh)] pr-3">
            <ol className="space-y-0 px-4 pb-4">
              {transcript.segments.map((seg, i) => (
                <li key={seg.index}>
                  {i > 0 ? <Separator className="my-2" /> : null}
                  <div className="flex gap-3 text-left">
                    <Button
                      className="shrink-0 font-mono text-[0.65rem] text-muted-foreground"
                      onClick={() => seekToSegment(seg.startMs)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      {formatMsRange(seg.startMs, seg.endMs)}
                    </Button>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed">
                      {seg.text}
                    </p>
                    <Button
                      onClick={() => onAction?.("insert_segment_to_chat", {
                        segmentIndex: seg.index,
                      })}
                      size="xs"
                      type="button"
                      variant="secondary"
                    >
                      삽입
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
