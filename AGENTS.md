# Agent Instructions

## Package Manager

Use **pnpm**: `pnpm install`, `pnpm build`, `pnpm test`

## Commit Attribution

AI commits MUST include:

```
Co-Authored-By: <model name> <noreply@anthropic.com>
```

Example: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## What This Project Is

dotagents is a package manager for `.agents` directories. It manages agent skill dependencies declared in `agents.toml`, maintains a lockfile for reproducibility, and handles symlinks so tools like Claude Code can discover skills from a single canonical location.

See `specs/SPEC.md` for the full design.

## Architecture

```
src/
├── index.ts              # Library entry point
├── cli/
│   ├── index.ts          # CLI entry (Bun compile target)
│   └── commands/         # init, install, add, remove, update, sync, list
├── config/               # agents.toml schema, loader, writer
├── lockfile/             # agents.lock schema, resolver, writer
├── skills/               # SKILL.md loader, resolver, installer
├── sources/              # git.ts, local.ts, cache.ts
├── symlinks/             # Symlink creation/management
├── gitignore/            # .agents/.gitignore generation
├── types/                # Shared type definitions
└── utils/                # exec.ts, hash.ts, fs.ts
```

## Key Conventions

- TypeScript strict mode
- Zod v4 for runtime validation (`import { z } from "zod/v4"`)
- ESM modules (`"type": "module"`)
- Vitest for testing
- oxlint for linting (with `--deny-warnings`)
- Use `export type` for type-only exports (required for Bun compatibility)
- Pre-commit hooks: oxlint via lint-staged

## Testing

- Co-locate tests with source (`foo.ts` -> `foo.test.ts`)
- Mock external services, use real-world fixtures
- Prefer integration tests over unit tests
- Add regression tests for bugs

## Verifying Changes

```bash
pnpm check
```

Or individually: `pnpm lint && pnpm typecheck && pnpm test`
