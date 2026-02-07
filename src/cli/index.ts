import { parseArgs } from "node:util";

const COMMANDS = ["init", "install", "add", "remove", "update", "sync", "list"] as const;
type Command = (typeof COMMANDS)[number];

function printUsage(): void {
  // eslint-disable-next-line no-console
  console.log(`dotagents - package manager for .agents directories

Usage: dotagents <command> [options]

Commands:
  init        Initialize agents.toml and .agents/skills/
  install     Install dependencies from agents.toml
  add         Add a skill dependency
  remove      Remove a skill dependency
  update      Update skills to latest versions
  sync        Reconcile gitignore, symlinks, verify state
  list        Show installed skills

Options:
  --help, -h  Show this help message
  --version   Show version`);
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean" },
    },
    strict: false,
  });

  if (values["version"]) {
    // eslint-disable-next-line no-console
    console.log("0.1.0");
    return;
  }

  const command = positionals[0] as Command | undefined;

  if (values["help"] || !command) {
    printUsage();
    return;
  }

  if (!COMMANDS.includes(command as Command)) {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  const mod = await import(`./commands/${command}.js`);
  await mod.default(positionals.slice(1));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
