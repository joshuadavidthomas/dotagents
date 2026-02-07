import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import chalk from "chalk";
import { generateDefaultConfig } from "../../config/writer.js";
import { writeAgentsGitignore } from "../../gitignore/writer.js";
import { ensureSkillsSymlink } from "../../symlinks/manager.js";
import { loadConfig } from "../../config/loader.js";
import { parseArgs } from "node:util";

export default async function init(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      force: { type: "boolean" },
    },
    strict: true,
  });

  const projectRoot = resolve(".");
  const configPath = join(projectRoot, "agents.toml");
  const agentsDir = join(projectRoot, ".agents");
  const skillsDir = join(agentsDir, "skills");

  // Create agents.toml
  if (existsSync(configPath) && !values["force"]) {
    console.error(
      chalk.red("agents.toml already exists. Use --force to overwrite."),
    );
    process.exitCode = 1;
    return;
  }

  await writeFile(configPath, generateDefaultConfig(), "utf-8");
  // eslint-disable-next-line no-console
  console.log(chalk.green("Created agents.toml"));

  // Create .agents/skills/
  await mkdir(skillsDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.log(chalk.green("Created .agents/skills/"));

  // Generate .agents/.gitignore
  await writeAgentsGitignore(agentsDir, []);
  // eslint-disable-next-line no-console
  console.log(chalk.green("Created .agents/.gitignore"));

  // Set up symlinks if config has them
  try {
    const config = await loadConfig(configPath);
    const targets = config.symlinks?.targets ?? [];
    for (const target of targets) {
      const targetDir = join(projectRoot, target);
      const result = await ensureSkillsSymlink(agentsDir, targetDir);
      if (result.created) {
        // eslint-disable-next-line no-console
        console.log(chalk.green(`Created symlink: ${target}/skills/ → .agents/skills/`));
      }
      if (result.migrated.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          chalk.yellow(
            `Migrated ${result.migrated.length} skill(s) from ${target}/skills/ to .agents/skills/`,
          ),
        );
      }
    }
  } catch {
    // Config just created, no symlinks configured - that's fine
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n${chalk.bold("Next steps:")}\n  1. Add skills: dotagents add @anthropics/pdf-processing\n  2. Install: dotagents install`,
  );
}
