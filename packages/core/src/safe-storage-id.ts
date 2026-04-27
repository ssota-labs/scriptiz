import path from "node:path";

/**
 * Public/tool-supplied ids used in filesystem paths (resource, list, job-related segments).
 * Rejects path traversal and separator characters.
 */
export function assertSafeStorageSegment(id: string, field: string): void {
  if (!id || id.length > 512) {
    throw new Error(`Invalid ${field}`);
  }
  if (id.includes("/") || id.includes("\\") || id.includes("..")) {
    throw new Error(`Invalid ${field}: path metacharacters not allowed`);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(id)) {
    throw new Error(`Invalid ${field}: use only [A-Za-z0-9._-]`);
  }
}

/** True if `resolved` is `root` or a path strictly under `root`. */
export function isPathUnderRoot(root: string, resolved: string): boolean {
  const a = path.resolve(root);
  const b = path.resolve(resolved);
  if (b === a) {
    return true;
  }
  const rel = path.relative(a, b);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
