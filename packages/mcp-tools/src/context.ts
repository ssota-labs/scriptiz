import { defaultScriptizDataDir } from "@scriptiz/core";
import type {
  ExtractorPort,
  JobQueuePort,
  ListStorePort,
  ResourceStorePort,
  TranscriptStorePort,
} from "@scriptiz/ports";
import { YtDlpExtractor } from "@scriptiz/extractor-ytdlp";
import { LocalJobQueue } from "@scriptiz/queue-local";
import { FilesystemStorage } from "@scriptiz/storage-filesystem";

export type ScriptizMcpContext = {
  dataDir: string;
  defaultLanguage: string;
  storage: TranscriptStorePort & ResourceStorePort & ListStorePort;
  queue: JobQueuePort;
  extractor: ExtractorPort;
};

export function createScriptizMcpContext(
  input: { dataDir?: string; defaultLanguage?: string },
): ScriptizMcpContext {
  const dataDir = input.dataDir?.trim() || defaultScriptizDataDir();
  return {
    dataDir,
    defaultLanguage: (() => {
      const fromInput = input.defaultLanguage?.trim();
      if (fromInput) {
        return fromInput;
      }
      return (
        process.env.DEFAULT_TRANSCRIPT_LANGUAGE?.trim() ||
        process.env.DEFAULT_LANGUAGE?.trim() ||
        "en"
      );
    })(),
    storage: new FilesystemStorage(dataDir),
    queue: new LocalJobQueue(dataDir),
    extractor: new YtDlpExtractor(),
  };
}
