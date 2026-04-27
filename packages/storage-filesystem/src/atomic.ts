import { randomBytes } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function atomicWriteFile(
  filePath: string,
  data: string,
): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `${path.basename(filePath)}.tmp.${randomBytes(8).toString("hex")}`,
  );
  await writeFile(tmp, data, "utf8");
  await rename(tmp, filePath);
}
