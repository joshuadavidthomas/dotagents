import { readFile, writeFile } from "node:fs/promises";
import type { SkillDependency } from "./schema.js";

/**
 * Add a skill entry to agents.toml.
 * Appends a new [skills.<name>] section at the end of the file.
 */
export async function addSkillToConfig(
  filePath: string,
  name: string,
  dep: SkillDependency,
): Promise<void> {
  const content = await readFile(filePath, "utf-8");

  const lines: string[] = [`\n[skills.${name}]`, `source = "${dep.source}"`];
  if (dep.ref) {
    lines.push(`ref = "${dep.ref}"`);
  }
  if (dep.path) {
    lines.push(`path = "${dep.path}"`);
  }

  const newContent = content.trimEnd() + "\n" + lines.join("\n") + "\n";
  await writeFile(filePath, newContent, "utf-8");
}

/**
 * Remove a skill entry from agents.toml.
 * Removes the [skills.<name>] section and its key-value pairs.
 */
export async function removeSkillFromConfig(
  filePath: string,
  name: string,
): Promise<void> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");

  const sectionHeader = `[skills.${name}]`;
  const result: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === sectionHeader) {
      skipping = true;
      // Remove any blank line immediately before the section header
      while (result.length > 0 && result[result.length - 1]?.trim() === "") {
        result.pop();
      }
      continue;
    }

    if (skipping) {
      // Stop skipping when we hit another section or end of file
      if (trimmed.startsWith("[")) {
        skipping = false;
        result.push(line);
      }
      // Skip key-value pairs and blank lines within the section
      continue;
    }

    result.push(line);
  }

  await writeFile(filePath, result.join("\n"), "utf-8");
}

/**
 * Generate a minimal agents.toml scaffold.
 */
export function generateDefaultConfig(): string {
  return `version = 1

[skills]
`;
}
