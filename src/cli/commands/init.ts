import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { generateDefaultConfig } from "../../config/writer.js";
import { writeAgentsGitignore } from "../../gitignore/writer.js";
import { ensureSkillsSymlink } from "../../symlinks/manager.js";
import { loadConfig } from "../../config/loader.js";
import { parseArgs } from "node:util";

export interface InitOptions {
  force?: boolean;
  projectRoot: string;
}

export async function runInit(opts: InitOptions): Promise<void> {
  const { projectRoot, force } = opts;
  const configPath = join(projectRoot, "agents.toml");
  const agentsDir = join(projectRoot, ".agents");
  const skillsDir = join(agentsDir, "skills");

  if (existsSync(configPath) && !force) {
    throw new InitError("agents.toml already exists. Use --force to overwrite.");
  }

  await writeFile(configPath, generateDefaultConfig(), "utf-8");
  await mkdir(skillsDir, { recursive: true });
  await writeAgentsGitignore(agentsDir, []);

  // Set up symlinks if config declares them
  const config = await loadConfig(configPath);
  const targets = config.symlinks?.targets ?? [];
  const symlinkResults: { target: string; created: boolean; migrated: string[] }[] = [];

  for (const target of targets) {
    const targetDir = join(projectRoot, target);
    const result = await ensureSkillsSymlink(agentsDir, targetDir);
    symlinkResults.push({ target, ...result });
  }

  return printSummary(symlinkResults);
}

function printSummary(
  symlinks: { target: string; created: boolean; migrated: string[] }[],
): void {
  // eslint-disable-next-line no-console
  console.log(chalk.green("Created agents.toml"));
  // eslint-disable-next-line no-console
  console.log(chalk.green("Created .agents/skills/"));
  // eslint-disable-next-line no-console
  console.log(chalk.green("Created .agents/.gitignore"));

  for (const s of symlinks) {
    if (s.created) {
      // eslint-disable-next-line no-console
      console.log(chalk.green(`Created symlink: ${s.target}/skills/ → .agents/skills/`));
    }
    if (s.migrated.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.yellow(
          `Migrated ${s.migrated.length} skill(s) from ${s.target}/skills/ to .agents/skills/`,
        ),
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n${chalk.bold("Next steps:")}\n  1. Add skills: dotagents add @anthropics/pdf-processing\n  2. Install: dotagents install`,
  );
}

export class InitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitError";
  }
}

export default async function init(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      force: { type: "boolean" },
    },
    strict: true,
  });

  const { resolve } = await import("node:path");
  try {
    await runInit({ projectRoot: resolve("."), force: values["force"] });
  } catch (err) {
    if (err instanceof InitError) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}
