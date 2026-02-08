import { readFile, writeFile } from "node:fs/promises";
import { stringify } from "smol-toml";
import type { SkillDependency } from "./schema.js";

/**
 * Add a skill entry to agents.toml.
 * Appends a new [skills.<name>] section at the end of the file.
 * Uses smol-toml's stringify for proper TOML escaping.
 */
export async function addSkillToConfig(
  filePath: string,
  name: string,
  dep: SkillDependency,
): Promise<void> {
  const content = await readFile(filePath, "utf-8");

  // Build a partial TOML object and stringify it for proper escaping
  const entry: Record<string, string> = { source: dep.source };
  if (dep.ref) entry["ref"] = dep.ref;
  if (dep.path) entry["path"] = dep.path;

  const section = stringify({ skills: { [name]: entry } });
  // stringify produces [skills.<name>]\nsource = "..."\n — strip the [skills] wrapper
  // since agents.toml already has it
  const sectionLines = section.split("\n").filter((l) => l.trim() !== "[skills]");

  const newContent = content.trimEnd() + "\n" + sectionLines.join("\n") + "\n";
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
