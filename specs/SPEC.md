# dotagents Specification

## Overview

dotagents is a package manager for `.agents` directories. It manages agent skill dependencies using the [agentskills.io](https://agentskills.io) standard, providing reproducible installs, a lockfile, and symlinks so that multiple agent tools (Claude Code, Cursor, Codex, etc.) can discover skills from a single canonical location.

Think of it as npm for agent skills: you declare dependencies in `agents.toml`, run `dotagents install`, and skills appear in `.agents/skills/` with symlinks into each tool's expected directory.

### Why

Agent skills are currently distributed as loose folders copied from git repos. There's no dependency management, no lockfile, no way to keep skills updated across a team. dotagents fills this gap.

### Key Principles

- **`.agents/skills/` is the canonical home** for all skills (managed and custom)
- **`agents.toml`** declares what you want; **`agents.lock`** pins what you have
- **Selective gitignore**: managed skills are gitignored, custom skills are tracked
- **Subdirectory symlinks**: `.claude/skills/ -> .agents/skills/`, not full directory symlinks
- **agentskills.io format**: skills are folders with a `SKILL.md` file containing YAML frontmatter

---

## agents.toml

The manifest file. Lives at the project root.

### Schema

```toml
version = 1

[project]
name = "my-project"              # Optional. For display purposes.

[symlinks]
targets = [".claude", ".cursor"] # Creates <target>/skills/ -> .agents/skills/

[skills]
# Each skill is a TOML table keyed by the skill name.

[skills.find-bugs]
source = "getsentry/skills"

[skills.warden-skill]
source = "getsentry/warden"

[skills.internal-review]
source = "git:https://git.corp.example.com/team/skills.git"
ref = "v2.0.0"

[skills.my-custom-skill]
source = "path:../shared-skills/my-custom-skill"
```

### Fields

#### Top-level

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Schema version. Always `1`. |
| `project` | No | Project metadata. |
| `symlinks` | No | Symlink configuration. |
| `skills` | No | Skill dependencies (empty table if no dependencies). |

#### `[project]`

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Project name for display. |

#### `[symlinks]`

| Field | Required | Description |
|-------|----------|-------------|
| `targets` | No | Array of directories to symlink. Each gets a `skills/` subdirectory pointing to `.agents/skills/`. Defaults to `[]`. |

#### `[skills.<name>]`

| Field | Required | Description |
|-------|----------|-------------|
| `source` | Yes | Skill source. `owner/repo` for GitHub, `owner/repo@ref` for pinned, `git:<url>` for non-GitHub, `path:<relative>` for local. |
| `ref` | No | Git ref (tag, branch, or SHA). Can also be specified inline as `owner/repo@ref`. Defaults to repo's default branch. |
| `path` | No | Explicit subdirectory path to the skill within the repo. Only needed when automatic discovery fails. |

### Source Types

The source format is inferred from the value. No prefix needed for GitHub repos.

#### `owner/repo` -- GitHub (most common)

Resolves to `https://github.com/<owner>/<repo>.git`. The skill is discovered by scanning the repo for SKILL.md files matching the skill name.

```toml
[skills.find-bugs]
source = "getsentry/skills"
# -> clone https://github.com/getsentry/skills.git
# -> discover skill named "find-bugs" in conventional directories

[skills.warden-skill]
source = "getsentry/warden"
ref = "v1.0.0"
# -> clone, checkout v1.0.0, discover "warden-skill"
```

Ref pinning can also be inline: `source = "getsentry/warden@v1.0.0"`

#### Skill discovery within a repo

After cloning, dotagents scans these locations (in order) for a skill matching the name:

1. `<name>/SKILL.md` (root-level skill directory)
2. `skills/<name>/SKILL.md`
3. `.agents/skills/<name>/SKILL.md`
4. `.claude/skills/<name>/SKILL.md`
5. Marketplace format: `plugins/*/skills/<name>/SKILL.md` (requires `.claude-plugin/` marker directory)

If discovery fails, the `path` field can be used as an explicit override:

```toml
[skills.my-skill]
source = "myorg/monorepo"
path = "tools/agent-skills/my-skill"
```

#### `git:<url>` -- non-GitHub git

For self-hosted GitLab, corporate git servers, etc. Same discovery logic applies.

```toml
[skills.internal-review]
source = "git:https://git.corp.example.com/team/skills.git"
ref = "main"
```

#### `path:<relative-path>` -- local filesystem

Relative to the project root. Copied (not symlinked) into `.agents/skills/` during install.

```toml
[skills.my-custom-skill]
source = "path:../shared-skills/my-custom-skill"
```

Local path skills have an integrity hash in the lockfile but no git commit. Re-copied if source content changes.

---

## agents.lock

The lockfile. Lives at the project root alongside `agents.toml`. TOML format.

**This file is auto-generated.** Do not edit manually. Commit it to version control.

### Format

```toml
# Auto-generated by dotagents. Do not edit.
version = 1

[skills.find-bugs]
source = "getsentry/skills"
resolved_url = "https://github.com/getsentry/skills.git"
resolved_path = "plugins/sentry-skills/skills/find-bugs"
commit = "c8881564e75eff4faaecc82d1c3f13356851b6e7"
integrity = "sha256-FWmCLdOj+x+XffiEg7Bx19drylVypeKz8me9OA757js="

[skills.warden-skill]
source = "getsentry/warden"
resolved_url = "https://github.com/getsentry/warden.git"
resolved_path = ".claude/skills/warden-skill"
commit = "bf8bc008ef99dd381d21c7a4e9dacc2769bd7738"
integrity = "sha256-g7g4avFU2KDTuY7ondgeyRIxny/nMW4Tkxbo+FC5pOw="

[skills.my-custom-skill]
source = "path:../shared-skills/my-custom-skill"
integrity = "sha256-No6eAmT2pIsOz0uQ1yBcWj=="
```

### Fields per skill

| Field | Present For | Description |
|-------|-------------|-------------|
| `source` | All | Original source specifier from agents.toml. |
| `resolved_url` | Git sources | Resolved git clone URL. |
| `resolved_path` | Git sources | Subdirectory within the repo where the skill was discovered. |
| `resolved_ref` | Git sources (optional) | The ref that was resolved (tag/branch name). Omitted when using default branch. |
| `commit` | Git sources | Full 40-char SHA of the resolved commit. This is the reproducibility guarantee. |
| `integrity` | All | SHA-256 content hash of the installed skill directory. |

### Integrity Hashing

The integrity hash is computed deterministically:

1. Walk all files in the skill directory, sorted alphabetically by relative path
2. For each file, compute SHA-256 of its contents
3. Concatenate all `<relative-path>\0<hex-hash>\n` strings
4. SHA-256 hash the concatenation
5. Base64-encode and prefix with `sha256-`

### Frozen Mode

`dotagents install --frozen` (for CI):

- Fails if `agents.lock` does not exist
- Fails if any skill in `agents.toml` is missing from the lockfile
- Fails if integrity hashes don't match after install
- Does NOT modify the lockfile

---

## CLI Commands

The CLI binary is `dotagents`. Currently runs via `tsx` during development; will be compiled with Bun for standalone distribution.

### `dotagents init`

Initialize a new project.

```
dotagents init [--force]
```

**Behavior:**
1. Create `agents.toml` with `version = 1` and empty `[skills]` table
2. Create `.agents/skills/` directory
3. Generate `.agents/.gitignore`
4. If symlink targets are configured, set up symlinks
5. Print next steps

**Flags:**
- `--force`: Overwrite existing `agents.toml`

### `dotagents install`

Install all dependencies from `agents.toml`.

```
dotagents install [--frozen] [--force]
```

**Behavior:**
1. Read `agents.toml`
2. If `agents.lock` exists, use locked commits for resolution
3. If `agents.lock` is missing (or `--force`), resolve all from sources
4. For each skill:
   a. Resolve source (check cache, clone/fetch if needed)
   b. Discover skill within the repo
   c. Copy skill directory into `.agents/skills/<name>/`
   d. Compute integrity hash
5. Write `agents.lock` (unless `--frozen`)
6. Regenerate `.agents/.gitignore`
7. Create/verify symlinks
8. Print summary

**Flags:**
- `--frozen`: Fail if lockfile is stale. Do not modify lockfile. For CI.
- `--force`: Re-resolve everything, ignore locked commits.

### `dotagents add <specifier>`

Add a skill dependency.

```
dotagents add <specifier> [--ref <ref>] [--name <name>]
```

**Examples:**
```bash
dotagents add getsentry/skills --name find-bugs
dotagents add getsentry/warden --name warden-skill --ref v1.0.0
dotagents add path:../shared-skills/my-skill
dotagents add myorg/single-skill-repo   # auto-detects if repo has one skill
```

**Behavior:**
1. Parse specifier to determine source type
2. Clone/fetch repo to cache
3. Discover skill(s) in the repo
   - If `--name` is given, look for that specific skill
   - If repo has exactly one skill, use it automatically
   - If repo has multiple skills and no `--name`, list them and ask user to pick
4. Add `[skills.<name>]` entry to `agents.toml`
5. Run install to fetch and place the skill
6. Update `agents.lock`

**Flags:**
- `--ref <ref>`: Pin to a specific tag/branch/commit
- `--name <name>`: Specify which skill to add from a multi-skill repo

### `dotagents remove <name>`

Remove a skill dependency.

```
dotagents remove <name>
```

**Behavior:**
1. Remove `[skills.<name>]` from `agents.toml`
2. Delete `.agents/skills/<name>/`
3. Remove entry from `agents.lock`
4. Regenerate `.agents/.gitignore`

### `dotagents update [<name>]`

Update skills to latest versions.

```
dotagents update              # all skills
dotagents update find-bugs    # one skill
```

**Behavior:**
1. For each skill:
   - Re-resolve from source (ignoring locked commit)
   - If ref is a 40-char SHA: skip (immutable)
   - Otherwise: fetch latest and compare commits
2. Copy updated skill directories
3. Update `agents.lock` with new commits and integrity hashes
4. Print changelog (old commit -> new commit)

### `dotagents sync`

Reconcile actual state with declared state.

```
dotagents sync
```

**Behavior:**
1. Regenerate `.agents/.gitignore`
2. Create/verify/repair symlinks
3. Warn if orphaned skills exist (installed but not in agents.toml)
4. Warn if declared skills are missing (in agents.toml but not installed)
5. Verify integrity hashes, warn on local modifications

### `dotagents list`

Show installed skills and status.

```
dotagents list [--json]
```

**Status indicators:**
- `✓` ok — installed, integrity matches lockfile
- `~` modified — installed but integrity doesn't match (locally modified)
- `✗` missing — in agents.toml but not installed
- `?` unlocked — installed but not in lockfile

**Output:** name, short commit SHA, source, status

---

## Skill Resolution

How dotagents resolves a specifier to a concrete skill directory.

### Resolution Flow

```
Source string
  |
  ├─ starts with "path:" -> Resolve relative to project root
  ├─ starts with "git:"  -> Parse URL, clone, discover skill by name
  └─ otherwise           -> Parse as owner/repo[@ref], clone from GitHub, discover skill by name
        |
        v
  Clone/fetch repo to cache (~/.local/dotagents/owner/repo/ or owner/repo@sha/)
        |
        v
  Discover skill: scan conventional directories for SKILL.md matching skill name
  (or use explicit `path` field if discovery fails)
        |
        v
  Parse YAML frontmatter, validate (requires `name` and `description`)
        |
        v
  Copy skill directory to .agents/skills/<name>/
```

### Caching

Cache location: `~/.local/dotagents/` (overridable via `DOTAGENTS_STATE_DIR`)

Structure:
- `owner/repo/` -- unpinned (shallow clone, refreshed per TTL, default 24h)
- `owner/repo@sha/` -- pinned (immutable, never refreshed)

Git operations (all non-interactive: `GIT_TERMINAL_PROMPT=0`, SSH `BatchMode=yes`):
- Initial: `git clone --depth=1`
- Update (unpinned): `git fetch --depth=1 origin && git reset --hard FETCH_HEAD`
- Pinned ref: `git fetch --depth=1 origin <ref> && git checkout FETCH_HEAD`

### Skill Validation

A valid skill directory must contain:
- `SKILL.md` with YAML frontmatter (delimited by `---`)
- Frontmatter must include `name` (string) and `description` (string)

The YAML frontmatter is parsed with a minimal key-value parser (no external YAML dependency). Supports simple `key: value` pairs and quoted values.

---

## Gitignore Strategy

All skills live in `.agents/skills/`. Managed (external) skills are gitignored. Custom (local) skills are tracked.

### How It Works

dotagents generates `.agents/.gitignore` listing every managed skill:

```gitignore
# Auto-generated by dotagents. Do not edit.
# Managed skills (installed by dotagents)
/skills/find-bugs/
/skills/warden-skill/
```

Custom skills in `.agents/skills/my-local-skill/` are NOT listed, so git tracks them normally.

### Regeneration

`.agents/.gitignore` is regenerated on every:
- `dotagents install`
- `dotagents add`
- `dotagents remove`
- `dotagents sync`

The list of managed skills comes from `agents.toml` — every declared skill is considered managed.

### Edge Cases

- **Custom skill name collides with managed skill**: `dotagents add` refuses to install if `.agents/skills/<name>/` already exists and is tracked by git
- **Someone commits a managed skill**: `dotagents sync` detects this and warns

---

## Symlink Strategy

### Problem

Each agent tool has its own directory with tool-specific files:
- `.claude/` -- `settings.json`, `commands/`, `skills/`
- `.cursor/` -- `rules/`, `skills/`
- `.codex/` -- `skills/`

Symlinking the entire directory (e.g., `.claude/ -> .agents/`) would clobber tool-specific files.

### Solution

Symlink only the `skills/` subdirectory:

```
.claude/skills/  -> .agents/skills/
.cursor/skills/  -> .agents/skills/
```

`.agents/skills/` is the canonical home. Each tool's `skills/` directory is a symlink.

### Configuration

```toml
[symlinks]
targets = [".claude", ".cursor"]
```

For each target in the array, dotagents creates `<target>/skills/ -> .agents/skills/`.

### Behavior

- Parent directory (`.claude/`) is created if it doesn't exist
- If `<target>/skills/` exists as a real directory, contents are migrated into `.agents/skills/` and replaced with a symlink
- If `<target>/skills/` is already a correct symlink, no action needed
- `dotagents sync` verifies and repairs broken symlinks

---

## Project Source Layout

```
dotagents/
  AGENTS.md                # Agent instructions
  CLAUDE.md -> AGENTS.md   # Symlink
  agents.toml              # Self-dogfooding
  agents.lock              # Pinned skill versions
  warden.toml              # Warden config for code analysis
  package.json
  tsconfig.json
  vitest.config.ts
  .gitignore
  specs/
    SPEC.md                # This file
  src/
    index.ts               # Library entry point (re-exports all modules)
    cli/
      index.ts             # CLI entry point, command routing
      commands/
        init.ts
        install.ts
        add.ts
        remove.ts
        update.ts
        sync.ts
        list.ts
    config/
      schema.ts            # Zod schemas for agents.toml
      loader.ts            # TOML parse + validate
      writer.ts            # TOML modification (add/remove skills)
      index.ts             # Re-exports
    lockfile/
      schema.ts            # Zod schemas for agents.lock
      loader.ts            # Parse + validate lockfile
      writer.ts            # Serialize lockfile (deterministic sorting)
      index.ts             # Re-exports
    skills/
      loader.ts            # Parse SKILL.md YAML frontmatter
      discovery.ts         # Scan conventional dirs + marketplace format
      resolver.ts          # Source specifier -> resolved skill on disk
      index.ts             # Re-exports
    sources/
      git.ts               # Git clone/fetch/checkout (shallow, non-interactive)
      local.ts             # Local path resolution
      cache.ts             # Global cache (~/.local/dotagents/) with TTL
      index.ts             # Re-exports
    symlinks/
      manager.ts           # Create/verify/repair symlinks, directory migration
      index.ts             # Re-exports
    gitignore/
      writer.ts            # Generate .agents/.gitignore
      index.ts             # Re-exports
    utils/
      exec.ts              # Child process execution (non-interactive git)
      hash.ts              # Deterministic SHA-256 directory hashing
      fs.ts                # copyDir helper
      index.ts             # Re-exports
```

## Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `smol-toml` | TOML parsing and serialization |
| `zod` | Runtime schema validation (v4, imported as `zod/v4`) |
| `chalk` | Terminal colors |

### Dev

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking (strict mode) |
| `vitest` | Testing framework |
| `oxlint` | Linting (with `--deny-warnings`) |
| `tsx` | Dev-time TypeScript execution |
| `simple-git-hooks` | Pre-commit hook management |
| `lint-staged` | Run oxlint on staged files |
| `@types/node` | Node.js type definitions |

No git library -- uses `git` CLI directly with non-interactive mode. No YAML library -- uses minimal key-value parser for SKILL.md frontmatter.

## Build and Distribution

### Current (Development)

```bash
pnpm dev -- init          # Run via tsx
npx tsx src/cli/index.ts  # Direct execution
```

### Planned (Bun Compile)

Standalone binary with no runtime dependencies:

```bash
bun build src/cli/index.ts --compile --outfile dist/dotagents
```

### Platform Matrix

Build per-platform binaries via GitHub Actions:

| Platform | Target |
|----------|--------|
| macOS arm64 | `darwin-arm64` |
| macOS x64 | `darwin-x64` |
| Linux x64 | `linux-x64` |
| Linux arm64 | `linux-arm64` |

### Distribution Channels

1. **GitHub Releases**: Per-platform binaries attached to releases
2. **Install script**: `curl -fsSL https://dotagents.dev/install.sh | sh` (detects platform, downloads binary)
3. **npm** (fallback): `npx dotagents` for users with Node.js
