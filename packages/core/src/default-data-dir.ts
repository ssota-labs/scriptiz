import { homedir } from "node:os";
import path from "node:path";

/**
 * 로컬 기본 데이터 디렉터리. `DATA_DIR` 미설정 시 사용 (`~/.scriptiz`).
 */
export function defaultScriptizDataDir(): string {
  return path.join(homedir(), ".scriptiz");
}
