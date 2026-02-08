import { z } from "zod/v4";

/**
 * Source specifier patterns (inferred from value):
 *   owner/repo          -- GitHub
 *   owner/repo@ref      -- GitHub pinned
 *   git:https://...     -- non-GitHub git
 *   path:../relative    -- local filesystem
 */
const GIT_URL_VALID = /^git:(https:\/\/|git:\/\/|ssh:\/\/|git@|file:\/\/|\/)/;

const skillSourceSchema = z.string().check(
  z.refine((s) => {
    if (s.startsWith("git:")) {
      // Require a valid protocol scheme or absolute path to prevent argument injection
      return GIT_URL_VALID.test(s);
    }
    if (s.startsWith("path:")) return true;
    // owner/repo or owner/repo@ref
    const base = s.includes("@") ? s.slice(0, s.indexOf("@")) : s;
    const parts = base.split("/");
    return parts.length === 2 && parts.every((p) => p.length > 0 && !p.startsWith("-"));
  }, "Must be owner/repo, owner/repo@ref, git:<url> (with https/git/ssh protocol), or path:<relative>"),
);

export type SkillSource = z.infer<typeof skillSourceSchema>;

const skillDependencySchema = z.object({
  source: skillSourceSchema,
  ref: z.string().optional(),
  path: z.string().optional(),
});

export type SkillDependency = z.infer<typeof skillDependencySchema>;

const symlinksConfigSchema = z.object({
  targets: z.array(z.string()).default([]),
});

export type SymlinksConfig = z.infer<typeof symlinksConfigSchema>;

const projectConfigSchema = z.object({
  name: z.string().optional(),
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

/** Skill names must be safe for use in file paths: alphanumeric, dots, hyphens, underscores. */
const skillNameSchema = z.string().regex(
  /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
  "Skill names must start with alphanumeric and contain only [a-zA-Z0-9._-]",
);

export const agentsConfigSchema = z.object({
  version: z.literal(1),
  project: projectConfigSchema.optional(),
  symlinks: symlinksConfigSchema.optional(),
  skills: z.record(skillNameSchema, skillDependencySchema).default({}),
});

export type AgentsConfig = z.infer<typeof agentsConfigSchema>;
