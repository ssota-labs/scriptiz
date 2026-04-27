import { assertSafeStorageSegment, isPathUnderRoot } from "@scriptiz/core";
import type {
  ListStorePort,
  ResourceStorePort,
  TranscriptStorePort,
} from "@scriptiz/ports";
import {
  resourceSchema,
  transcriptSchema,
  userListSchema,
} from "@scriptiz/schemas";
import type { Resource, Transcript, UserList } from "@scriptiz/schemas";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { atomicWriteFile } from "./atomic.js";

const LANG_SEG = /^[a-zA-Z0-9._-]+$/;

function rawSubtitleRelative(
  resourceId: string,
  language: string,
  ext: string,
) {
  return `transcripts/${resourceId}/raw.${language}.${ext}`;
}

/**
 * `data` directory root: expects resources/, transcripts/, lists/, tmp/ as direct children.
 */
export class FilesystemStorage
  implements ResourceStorePort, TranscriptStorePort, ListStorePort
{
  constructor(private readonly dataRoot: string) {}

  private safeResourceId(resourceId: string) {
    assertSafeStorageSegment(resourceId, "resourceId");
  }

  private safeListId(id: string) {
    assertSafeStorageSegment(id, "listId");
  }

  private resourcePath(id: string) {
    this.safeResourceId(id);
    const p = path.join(this.dataRoot, "resources", `${id}.json`);
    if (!isPathUnderRoot(this.dataRoot, p)) {
      throw new Error("resource path outside data root");
    }
    return p;
  }

  private listPath(id: string) {
    this.safeListId(id);
    const p = path.join(this.dataRoot, "lists", `${id}.json`);
    if (!isPathUnderRoot(this.dataRoot, p)) {
      throw new Error("list path outside data root");
    }
    return p;
  }

  private transcriptPath(resourceId: string, language: string) {
    this.safeResourceId(resourceId);
    if (!LANG_SEG.test(language)) {
      throw new Error("Invalid language for transcript path");
    }
    const p = path.join(
      this.dataRoot,
      "transcripts",
      resourceId,
      `${language}.json`,
    );
    if (!isPathUnderRoot(this.dataRoot, p)) {
      throw new Error("transcript path outside data root");
    }
    return p;
  }

  private rawSubtitlePath(
    resourceId: string,
    language: string,
    ext: string,
  ) {
    this.safeResourceId(resourceId);
    if (!LANG_SEG.test(language)) {
      throw new Error("Invalid language for raw subtitle file");
    }
    const p = path.join(
      this.dataRoot,
      "transcripts",
      resourceId,
      `raw.${language}.${ext}`,
    );
    if (!isPathUnderRoot(this.dataRoot, p)) {
      throw new Error("raw subtitle path outside data root");
    }
    return p;
  }

  /* ResourceStorePort */

  async getResourceById(id: string): Promise<Resource | null> {
    const p = this.resourcePath(id);
    if (!(await fileExists(p))) {
      return null;
    }
    const raw = JSON.parse(await readFile(p, "utf8")) as unknown;
    return resourceSchema.parse(raw);
  }

  async putResource(resource: Resource): Promise<void> {
    const parsed = resourceSchema.parse(resource);
    await atomicWriteFile(
      this.resourcePath(parsed.id),
      `${JSON.stringify(parsed, null, 2)}\n`,
    );
  }

  /* TranscriptStorePort */

  async getTranscript(
    resourceId: string,
    language: string,
  ): Promise<Transcript | null> {
    const p = this.transcriptPath(resourceId, language);
    if (!(await fileExists(p))) {
      return null;
    }
    const raw = JSON.parse(await readFile(p, "utf8")) as unknown;
    return transcriptSchema.parse(raw);
  }

  async putTranscript(transcript: Transcript): Promise<void> {
    const parsed = transcriptSchema.parse(transcript);
    await atomicWriteFile(
      this.transcriptPath(parsed.resourceId, parsed.language),
      `${JSON.stringify(parsed, null, 2)}\n`,
    );
  }

  async putRawSubtitle(
    resourceId: string,
    language: string,
    body: string,
    format: "vtt" = "vtt",
  ): Promise<string> {
    const p = this.rawSubtitlePath(resourceId, language, format);
    await atomicWriteFile(p, body);
    return rawSubtitleRelative(resourceId, language, format);
  }

  async listTranscriptLanguageCodes(resourceId: string): Promise<string[]> {
    this.safeResourceId(resourceId);
    const root = path.join(this.dataRoot, "transcripts", resourceId);
    if (!isPathUnderRoot(this.dataRoot, root)) {
      throw new Error("transcripts path outside data root");
    }
    if (!(await fileExists(root))) {
      return [];
    }
    const files = await readdir(root);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  }

  /* ListStorePort */

  async getListById(id: string): Promise<UserList | null> {
    const p = this.listPath(id);
    if (!(await fileExists(p))) {
      return null;
    }
    const raw = JSON.parse(await readFile(p, "utf8")) as unknown;
    return userListSchema.parse(raw);
  }

  async putList(userList: UserList): Promise<void> {
    const parsed = userListSchema.parse(userList);
    await atomicWriteFile(
      this.listPath(parsed.id),
      `${JSON.stringify(parsed, null, 2)}\n`,
    );
  }

  async listIds(): Promise<string[]> {
    const root = path.join(this.dataRoot, "lists");
    if (!(await fileExists(root))) {
      return [];
    }
    const files = await readdir(root);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}
