import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const SUBDIRS = ["resources", "lists", "transcripts", "jobs", "tmp"] as const;

/**
 * Ensures `dataRoot` and expected subdirectories exist. If a subpath exists
 * but is not a directory (e.g. `resources` is a file), throws with recovery hints.
 */
export async function ensureScriptizDataLayout(dataRoot: string): Promise<void> {
  await mkdir(dataRoot, { recursive: true });
  for (const name of SUBDIRS) {
    const p = path.join(dataRoot, name);
    try {
      const st = await stat(p);
      if (!st.isDirectory()) {
        throw new Error(
          `Scriptiz data: "${name}" must be a directory, but a file exists at ${p}. ` +
            `Fix: remove that file, or reset storage (Docker: stop containers, then \`docker volume rm scriptiz-data\` — deletes all data in that volume). ` +
            `Or set SCRIPTIZ_DATA_DIR to a new empty folder on the host.`,
        );
      }
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e
          ? (e as NodeJS.ErrnoException).code
          : undefined;
      if (code === "ENOENT") {
        await mkdir(p, { recursive: true });
      } else {
        throw e;
      }
    }
  }
}
