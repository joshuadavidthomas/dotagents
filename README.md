# dotagents

A package manager for `.agents` directories. Declare agent skill dependencies in `agents.toml`, lock versions for reproducibility, and let every tool on your team discover skills from a single place.

## Why dotagents?

**One source of truth.** Skills live in `.agents/skills/` and symlink into `.claude/skills/`, `.cursor/skills/`, or wherever your tools expect them. No copy-pasting between directories.

**Reproducible.** `agents.lock` pins exact commits and integrity hashes. `dotagents install --frozen` in CI guarantees everyone runs the same skills.

**Shareable.** Skills are just directories with a `SKILL.md`. Host them in any git repo, discover them automatically, install with one command.

## Quick Start

```bash
# Initialize a new project
npx dotagents init

# Add a skill from a GitHub repo
npx dotagents add getsentry/skills --name find-bugs

# Install all declared skills
npx dotagents install
```

This creates an `agents.toml`:

```toml
version = 1
gitignore = false

[[skills]]
name = "find-bugs"
source = "getsentry/skills"
```

And a lockfile (`agents.lock`) pinning the exact commit and integrity hash.

## Commands

| Command | Description |
|---------|-------------|
| `dotagents init` | Create `agents.toml` and `.agents/skills/` |
| `dotagents add <source>` | Add a skill dependency |
| `dotagents remove <name>` | Remove a skill |
| `dotagents install` | Install all dependencies from `agents.toml` |
| `dotagents update [name]` | Update skills to latest versions |
| `dotagents list` | Show installed skills and their status |
| `dotagents sync` | Reconcile gitignore, symlinks, and verify state |

## Source Formats

```toml
[[skills]]
name = "find-bugs"
source = "getsentry/skills"              # GitHub repo (auto-discover)

[[skills]]
name = "review"
source = "getsentry/skills@v1.0.0"       # Pinned to a ref

[[skills]]
name = "internal"
source = "git:https://git.corp.dev/repo"  # Non-GitHub git

[[skills]]
name = "local"
source = "path:./my-skills/local-skill"   # Local directory
```

## How It Works

1. Skills are declared in `agents.toml` at the project root
2. `dotagents install` clones repos, discovers skills by convention, and copies them into `.agents/skills/`
3. `agents.lock` records the resolved commit and a SHA-256 integrity hash
4. By default (`gitignore = false`), skills are checked into git so collaborators get them immediately. Set `gitignore = true` to auto-generate `.agents/.gitignore` and exclude managed skills instead.
5. Symlinks connect `.agents/skills/` to wherever your tools look (configured via `symlinks.targets`)

## Checking In Skills

By default, `dotagents init` sets `gitignore = false` so installed skills are committed to git. This means anyone cloning the repo gets skills immediately — they only need dotagents when adding or updating skills.

To gitignore managed skills instead (collaborators must run `dotagents install`), set `gitignore = true` in `agents.toml` or remove the field entirely (it defaults to `true` when absent for backward compatibility).

## Contributing

```bash
git clone git@github.com:getsentry/dotagents.git
cd dotagents
pnpm install
pnpm check  # lint + typecheck + test
```

## License

MIT
