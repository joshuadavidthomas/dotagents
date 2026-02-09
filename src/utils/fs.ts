import { cp, rm } from "node:fs/promises";

/**
 * Copy a directory recursively.
 * Removes destination first if it exists.
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
}
