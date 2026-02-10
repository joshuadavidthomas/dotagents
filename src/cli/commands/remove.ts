import { join } from "node:path";
import { rm } from "node:fs/promises";
import { parseArgs } from "node:util";
import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { removeSkillFromConfig } from "../../config/writer.js";
import { loadLockfile } from "../../lockfile/loader.js";
import { writeLockfile } from "../../lockfile/writer.js";
import { updateAgentsGitignore } from "../../gitignore/writer.js";

export class RemoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemoveError";
  }
}

export interface RemoveOptions {
  projectRoot: string;
  skillName: string;
}

export async function runRemove(opts: RemoveOptions): Promise<void> {
  const { projectRoot, skillName } = opts;
  const configPath = join(projectRoot, "agents.toml");
  const lockPath = join(projectRoot, "agents.lock");
  const agentsDir = join(projectRoot, ".agents");
  const skillDir = join(agentsDir, "skills", skillName);

  // Verify skill exists in config
  const config = await loadConfig(configPath);
  if (!config.skills.some((s) => s.name === skillName)) {
    throw new RemoveError(`Skill "${skillName}" not found in agents.toml.`);
  }

  // 1. Remove from agents.toml
  await removeSkillFromConfig(configPath, skillName);

  // 2. Delete skill directory
  await rm(skillDir, { recursive: true, force: true });

  // 3. Update lockfile
  const lockfile = await loadLockfile(lockPath);
  if (lockfile) {
    delete lockfile.skills[skillName];
    await writeLockfile(lockPath, lockfile);
  }

  // 4. Regenerate gitignore
  const updatedConfig = await loadConfig(configPath);
  const managedNames = updatedConfig.skills.map((s) => s.name);
  await updateAgentsGitignore(agentsDir, updatedConfig.gitignore, managedNames);
}

export default async function remove(args: string[]): Promise<void> {
  const { positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
  });

  const skillName = positionals[0];
  if (!skillName) {
    console.error(chalk.red("Usage: dotagents remove <name>"));
    process.exitCode = 1;
    return;
  }

  const { resolve } = await import("node:path");
  try {
    await runRemove({ projectRoot: resolve("."), skillName });
    console.log(chalk.green(`Removed skill: ${skillName}`));
  } catch (err) {
    if (err instanceof RemoveError) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}
