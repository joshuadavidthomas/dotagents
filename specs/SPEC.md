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

[skills.pdf-processing]
source = "anthropics/skills"
ref = "v1.2.0"

[skills.find-bugs]
source = "getsentry/sentry-skills@main"

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
[skills.pdf-processing]
source = "anthropics/skills"
# -> clone https://github.com/anthropics/skills.git
# -> discover skill named "pdf-processing" in conventional directories

[skills.find-bugs]
source = "getsentry/sentry-skills"
ref = "v1.0.0"
# -> clone, checkout v1.0.0, discover "find-bugs"
```

Ref pinning can also be inline: `source = "anthropics/skills@v1.0.0"`

#### Skill discovery within a repo

After cloning, dotagents scans these directories (in order) for a skill matching the name:

1. `<name>/SKILL.md` (root-level skill directory)
2. `skills/<name>/SKILL.md`
3. `.agents/skills/<name>/SKILL.md`
4. `.claude/skills/<name>/SKILL.md`
5. Marketplace format: `.claude-plugin/marketplace.json` -> `plugins/*/skills/<name>/SKILL.md`

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

[skills.pdf-processing]
source = "anthropics/skills"
resolved_url = "https://github.com/anthropics/skills.git"
resolved_path = "pdf-processing"
resolved_ref = "v1.2.0"
commit = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
integrity = "sha256-Kx3bXjQ9mFpLw7rN8vYzTg=="

[skills.find-bugs]
source = "getsentry/sentry-skills@main"
resolved_url = "https://github.com/getsentry/sentry-skills.git"
resolved_path = "find-bugs"
resolved_ref = "main"
commit = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3"
integrity = "sha256-Lm4cYkR0nGqMx8sO9wZaUh=="

[skills.my-custom-skill]
source = "path:../shared-skills/my-custom-skill"
integrity = "sha256-No6eAmT2pIsOz0uQ1yBcWj=="
```

### Fields per skill

| Field | Present For | Description |
|-------|-------------|-------------|
| `source` | All | Original source specifier from agents.toml. |
| `resolved_url` | Git sources | Resolved git clone URL. |
| `resolved_path` | Git sources | Subdirectory within the repo. |
| `resolved_ref` | Git sources | The ref that was resolved (tag/branch name). |
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

The CLI binary is `dotagents`. Built with Bun for standalone distribution.

### `dotagents init`

Initialize a new project.

```
dotagents init [--force]
```

**Behavior:**
1. Create `agents.toml` with `version = 1` and empty `[skills]` table
2. Create `.agents/skills/` directory
3. If any symlink targets are configured (or `.claude/` exists), set up symlinks
4. Generate `.agents/.gitignore`
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
   a. Check global cache (`~/.local/dotagents/cache/`)
   b. If not cached, clone/fetch the git repo
   c. Copy skill directory into `.agents/skills/<name>/`
   d. Verify integrity hash
5. Write `agents.lock` (unless `--frozen`)
6. Regenerate `.agents/.gitignore`
7. Create/verify symlinks
8. Print summary

**Flags:**
- `--frozen`: Fail if lockfile is stale. Do not modify lockfile. For CI.
- `--force`: Re-download everything, ignore cache.

### `dotagents add <specifier>`

Add a skill dependency.

```
dotagents add <specifier> [--ref <ref>] [--name <name>]
```

**Examples:**
```bash
dotagents add anthropics/skills              # interactive: pick from discovered skills
dotagents add getsentry/sentry-skills --ref v1.0.0
dotagents add path:../shared-skills/my-skill
```

**Behavior:**
1. Parse specifier to determine source type
2. Resolve source (clone if needed, locate SKILL.md)
3. Read skill name from SKILL.md frontmatter
4. Add `[skills.<name>]` entry to `agents.toml`
5. Install the skill
6. Update `agents.lock`
7. Regenerate `.agents/.gitignore`

**Flags:**
- `--ref <ref>`: Pin to a specific tag/branch/commit
- `--name <name>`: Override the skill name (defaults to SKILL.md `name` field)

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

Update skills to latest versions within ref constraints.

```
dotagents update              # all skills
dotagents update find-bugs    # one skill
```

**Behavior:**
1. For each skill:
   - If ref is a branch: fetch latest commit on that branch
   - If ref is a tag: check for newer tags (semver-aware)
   - If ref is a commit SHA: skip (immutable)
2. Update `agents.lock` with new commits
3. Re-install updated skills
4. Print changelog (old commit -> new commit)

### `dotagents sync`

Reconcile actual state with declared state.

```
dotagents sync
```

**Behavior:**
1. Regenerate `.agents/.gitignore`
2. Create/verify/repair symlinks
3. Warn if managed skills are accidentally tracked in git
4. Warn if orphaned skills exist (installed but not in agents.toml)
5. Verify integrity hashes, warn on local modifications

### `dotagents list`

Show installed skills and status.

```
dotagents list [--json]
```

**Output columns:** name, source, installed commit (short SHA), status (up to date / outdated / modified / custom)

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
  Parse YAML frontmatter, validate
        |
        v
  Copy skill directory to .agents/skills/<name>/
```

### Caching

Cache location: `~/.local/dotagents/` (overridable via `DOTAGENTS_STATE_DIR`)

Structure:
- `owner/repo/` -- unpinned (refreshed per TTL, default 24h)
- `owner/repo@sha/` -- pinned (immutable, never refreshed)

Git operations:
- Initial: `git clone --depth=1`
- Update (unpinned): `git fetch --depth=1 origin && git reset --hard origin/HEAD`
- Pinned: `git fetch --depth=1 origin <sha> && git checkout <sha>` (unshallow fallback if needed)

### Skill Validation

A valid skill directory must contain:
- `SKILL.md` with valid YAML frontmatter
- Frontmatter must include `name` and `description` fields
- `name` must match: lowercase letters, numbers, hyphens; max 64 chars; no leading/trailing/consecutive hyphens

Optional directories: `scripts/`, `references/`, `assets/`

---

## Gitignore Strategy

All skills live in `.agents/skills/`. Managed (external) skills are gitignored. Custom (local) skills are tracked.

### How It Works

dotagents generates `.agents/.gitignore` listing every managed skill:

```gitignore
# Auto-generated by dotagents. Do not edit.
# Managed skills (installed by dotagents)
/skills/pdf-processing/
/skills/find-bugs/
/skills/code-review/
```

Custom skills in `.agents/skills/my-local-skill/` are NOT listed, so git tracks them normally.

### Regeneration

`.agents/.gitignore` is regenerated on every:
- `dotagents install`
- `dotagents add`
- `dotagents remove`
- `dotagents sync`

The list of managed skills is derived from `agents.toml` -- any skill with a non-`path:` source is considered managed. (`path:` sources could go either way; for now they are also gitignored since they're installed by dotagents.)

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
- If `<target>/skills/` exists as a real directory, `dotagents init` offers to migrate its contents into `.agents/skills/` and replace with a symlink
- If `<target>/skills/` is already a correct symlink, no action needed
- `dotagents sync` verifies and repairs broken symlinks

### Future Extensibility

As dotagents manages more resource types beyond skills, additional subdirectory symlinks can be added (e.g., `<target>/subagents/ -> .agents/subagents/`). The `[symlinks]` schema can grow to support this without breaking existing configs.

---

## Installation Flow

What happens during `dotagents install`:

```
1. Read agents.toml
   |
2. Read agents.lock (if exists)
   |
3. For each skill in agents.toml:
   |
   ├─ In lockfile with matching source?
   |  └─ YES: Use locked commit + integrity
   |  └─ NO: Resolve from source (new or changed dependency)
   |
4. For each skill to install:
   |
   ├─ Check global cache (~/.local/dotagents/cache/)
   |  ├─ HIT: Copy from cache
   |  └─ MISS: Clone/fetch git repo
   |
   ├─ Extract skill directory (locate by path)
   ├─ Validate SKILL.md
   ├─ Compute integrity hash
   ├─ Copy into .agents/skills/<name>/
   └─ Update cache
   |
5. Write agents.lock
6. Generate .agents/.gitignore
7. Create/verify symlinks
8. Print summary
```

### Global Cache

Location: `~/.local/dotagents/cache/`

Structure:
```
~/.local/dotagents/cache/
  github.com/
    anthropics/
      skills/
        a1b2c3d4.../    # Cached at specific commit
          pdf-processing/
          code-review/
    getsentry/
      sentry-skills/
        b2c3d4e5.../
          find-bugs/
```

The cache stores full repo clones (bare repos) to enable fast fetches. Skill directories are extracted from the cached repo at the locked commit.

---

## Build and Distribution

### Bun Compile

Primary distribution: standalone binary with no runtime dependencies.

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

---

## Project Source Layout

```
dotagents/
  AGENTS.md                # Agent instructions
  CLAUDE.md -> AGENTS.md   # Symlink
  agents.toml              # Self-dogfooding (optional)
  package.json
  tsconfig.json
  vitest.config.ts
  .gitignore
  specs/
    SPEC.md                # This file
  src/
    index.ts               # Library entry point
    cli/
      index.ts             # CLI entry (Bun compile target)
      commands/
        init.ts
        install.ts
        add.ts
        remove.ts
        update.ts
        sync.ts
        list.ts
      output/
        reporter.ts        # TTY-aware console output
    config/
      schema.ts            # Zod schemas for agents.toml
      loader.ts            # TOML parse + validate
      writer.ts            # TOML modification (add/remove skills)
    lockfile/
      schema.ts            # Zod schemas for agents.lock
      resolver.ts          # Compare agents.toml vs lockfile
      writer.ts            # Serialize lockfile
    skills/
      loader.ts            # Parse SKILL.md (agentskills.io format)
      resolver.ts          # Specifier -> ResolvedSource
      installer.ts         # Orchestrate install flow
    sources/
      git.ts               # Git clone/fetch/checkout
      local.ts             # Local path resolution
      cache.ts             # Global cache management
    symlinks/
      manager.ts           # Create/verify/repair symlinks
    gitignore/
      writer.ts            # Generate .agents/.gitignore
    types/
      index.ts             # Shared types
    utils/
      exec.ts              # Child process execution
      hash.ts              # SHA-256 content hashing
      fs.ts                # Filesystem helpers
```

## Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `smol-toml` | TOML parsing and serialization |
| `zod` | Runtime schema validation |
| `chalk` | Terminal colors |

### Dev

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking |
| `vitest` | Testing |
| `eslint` | Linting |
| `typescript-eslint` | TypeScript lint rules |
| `tsx` | Dev-time TS execution |

No git library -- use `git` CLI directly. No heavy TUI framework.
