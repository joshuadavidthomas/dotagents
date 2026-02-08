import { join } from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { loadSkillMd } from "./loader.js";
import type { SkillMeta } from "./loader.js";

export interface DiscoveredSkill {
  /** Relative path within the repo to the skill directory */
  path: string;
  meta: SkillMeta;
}

/**
 * Conventional directories to scan for skills, in priority order.
 * Each pattern is a function that takes the skill name and returns a relative path.
 */
const SKILL_PATTERNS = [
  (name: string) => name,
  (name: string) => `skills/${name}`,
  (name: string) => `.agents/skills/${name}`,
  (name: string) => `.claude/skills/${name}`,
];

/**
 * Discover a specific skill by name within a repo directory.
 * Scans conventional directories in priority order.
 */
export async function discoverSkill(
  repoDir: string,
  skillName: string,
): Promise<DiscoveredSkill | null> {
  // Try each conventional pattern
  for (const pattern of SKILL_PATTERNS) {
    const relPath = pattern(skillName);
    const skillMdPath = join(repoDir, relPath, "SKILL.md");
    if (existsSync(skillMdPath)) {
      const meta = await loadSkillMd(skillMdPath);
      return { path: relPath, meta };
    }
  }

  // Marketplace format: check .claude-plugin/marketplace.json
  const marketplaceSkill = await tryMarketplaceFormat(repoDir, skillName);
  if (marketplaceSkill) return marketplaceSkill;

  return null;
}

/**
 * Discover all skills in a repo.
 * Scans conventional directories and returns everything found.
 */
export async function discoverAllSkills(
  repoDir: string,
): Promise<DiscoveredSkill[]> {
  const found = new Map<string, DiscoveredSkill>();

  // Scan each pattern location for directories containing SKILL.md
  const scanDirs = [".", "skills", ".agents/skills", ".claude/skills"];
  for (const scanDir of scanDirs) {
    const absDir = join(repoDir, scanDir);
    if (!existsSync(absDir)) continue;

    let entries;
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillMdPath = join(absDir, entry.name, "SKILL.md");
      if (!existsSync(skillMdPath)) continue;

      // First match wins (higher priority dirs are scanned first)
      if (found.has(entry.name)) continue;

      try {
        const meta = await loadSkillMd(skillMdPath);
        const relPath = scanDir === "." ? entry.name : `${scanDir}/${entry.name}`;
        found.set(entry.name, { path: relPath, meta });
      } catch {
        // Skip skills with invalid SKILL.md
      }
    }
  }

  // Marketplace format: plugins/*/skills/*/SKILL.md
  const marketplaceSkills = await scanMarketplaceFormat(repoDir);
  for (const skill of marketplaceSkills) {
    if (!found.has(skill.meta.name)) {
      found.set(skill.meta.name, skill);
    }
  }

  return [...found.values()];
}

async function scanMarketplaceFormat(
  repoDir: string,
): Promise<DiscoveredSkill[]> {
  const pluginsDir = join(repoDir, ".claude-plugin");
  if (!existsSync(pluginsDir)) return [];

  const pluginsDirPath = join(repoDir, "plugins");
  if (!existsSync(pluginsDirPath)) return [];

  let plugins;
  try {
    plugins = await readdir(pluginsDirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: DiscoveredSkill[] = [];
  for (const plugin of plugins) {
    if (!plugin.isDirectory()) continue;
    const skillsDir = join(pluginsDirPath, plugin.name, "skills");
    if (!existsSync(skillsDir)) continue;

    let skillEntries;
    try {
      skillEntries = await readdir(skillsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of skillEntries) {
      if (!entry.isDirectory()) continue;
      const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
      if (!existsSync(skillMdPath)) continue;

      try {
        const meta = await loadSkillMd(skillMdPath);
        results.push({
          path: `plugins/${plugin.name}/skills/${entry.name}`,
          meta,
        });
      } catch {
        // Skip invalid
      }
    }
  }

  return results;
}

async function tryMarketplaceFormat(
  repoDir: string,
  skillName: string,
): Promise<DiscoveredSkill | null> {
  const pluginsDir = join(repoDir, ".claude-plugin");
  if (!existsSync(pluginsDir)) return null;

  // Scan plugins/*/skills/<name>/SKILL.md
  const pluginsDirPath = join(repoDir, "plugins");
  if (!existsSync(pluginsDirPath)) return null;

  let plugins;
  try {
    plugins = await readdir(pluginsDirPath, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const plugin of plugins) {
    if (!plugin.isDirectory()) continue;
    const skillMdPath = join(pluginsDirPath, plugin.name, "skills", skillName, "SKILL.md");
    if (!existsSync(skillMdPath)) continue;

    const meta = await loadSkillMd(skillMdPath);
    return { path: `plugins/${plugin.name}/skills/${skillName}`, meta };
  }

  return null;
}
