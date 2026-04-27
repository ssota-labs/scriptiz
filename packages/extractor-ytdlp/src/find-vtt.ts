import { readdir } from "node:fs/promises";
import path from "node:path";

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walkFiles(p)));
    } else {
      out.push(p);
    }
  }
  return out;
}

export async function findVttFiles(outputDir: string): Promise<string[]> {
  return (await walkFiles(outputDir)).filter((f) => f.endsWith(".vtt"));
}
