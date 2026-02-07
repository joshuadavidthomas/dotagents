import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Compute a deterministic integrity hash of a directory.
 *
 * Algorithm:
 * 1. Walk all files, sorted alphabetically by relative path
 * 2. SHA-256 each file's contents
 * 3. Concatenate "<relative-path>\0<hex-hash>\n"
 * 4. SHA-256 the concatenation
 * 5. Base64-encode with "sha256-" prefix
 */
export async function hashDirectory(dirPath: string): Promise<string> {
  const files = await walkFiles(dirPath);
  files.sort();

  const parts: string[] = [];
  for (const filePath of files) {
    const relPath = relative(dirPath, filePath);
    const content = await readFile(filePath);
    const fileHash = createHash("sha256").update(content).digest("hex");
    parts.push(`${relPath}\0${fileHash}\n`);
  }

  const combined = parts.join("");
  const digest = createHash("sha256").update(combined).digest("base64");
  return `sha256-${digest}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
    // Skip symlinks, sockets, etc.
  }

  return results;
}

/**
 * SHA-256 hex hash of a string.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
