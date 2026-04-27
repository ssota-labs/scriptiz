import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { JobStatusView } from "@scriptiz/mcp-tools/ui";
import type { ExtractionJobStatus } from "@scriptiz/schemas";

type Props = { v: JobStatusView };

function statusTone(
  s: ExtractionJobStatus,
): "default" | "secondary" | "destructive" {
  if (s === "failed") {
    return "destructive";
  }
  if (s === "completed") {
    return "secondary";
  }
  return "default";
}

export function JobStatusViewPanel({ v }: Props) {
  const { job, resource } = v;
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <h1 className="text-lg font-medium">Job 상태</h1>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-mono text-sm">{job.id}</CardTitle>
            <Badge variant={statusTone(job.status)}>{job.status}</Badge>
          </div>
          <CardDescription className="break-all">{job.sourceUrl}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">kind: </span>
            {job.kind}
          </p>
          {job.resourceId ? (
            <p>
              <span className="text-muted-foreground">resourceId: </span>
              <span className="font-mono text-xs">{job.resourceId}</span>
            </p>
          ) : null}
          {job.language ? (
            <p>
              <span className="text-muted-foreground">language: </span>
              {job.language}
            </p>
          ) : null}
          {job.errorCode ? (
            <p className="text-destructive">
              {job.errorCode}
              {job.errorMessage ? `: ${job.errorMessage}` : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {resource ? (
        <Card>
          <CardHeader>
            <CardTitle>리소스</CardTitle>
            <CardDescription>{resource.title}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="break-all text-muted-foreground">{resource.sourceUrl}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
