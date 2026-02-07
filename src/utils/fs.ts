import { cp, rm, mkdir } from "node:fs/promises";

/**
 * Copy a directory recursively.
 * Removes destination first if it exists.
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
}
