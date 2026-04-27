import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ListView } from "@scriptiz/mcp-tools/ui";

type Props = { v: ListView };

export function ListViewPanel({ v }: Props) {
  const { list, items } = v;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-lg font-medium">{list.name}</h1>
        {list.description ? (
          <p className="text-sm text-muted-foreground">{list.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          항목 {items.length}개
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((row, i) => (
          <li key={row.resource.id}>
            {i > 0 ? <Separator className="my-3" /> : null}
            <Card size="sm">
              <CardHeader>
                <CardTitle className="line-clamp-2">
                  {row.resource.title}
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-1">
                  <span className="text-[0.65rem] uppercase">
                    {row.resource.type}
                  </span>
                  {row.extractionStatus ? (
                    <Badge variant="secondary">{row.extractionStatus}</Badge>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs break-all text-muted-foreground">
                  {row.resource.sourceUrl}
                </p>
                {row.transcriptLanguages.length > 0 ? (
                  <p className="mt-2 text-xs">
                    <span className="text-muted-foreground">자막: </span>
                    {row.transcriptLanguages.join(", ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
