import { z } from "zod/v4";

/**
 * Source specifier patterns:
 *   github:owner/repo/path
 *   git:https://example.com/repo.git
 *   path:../relative/path
 *   @scope/name
 */
const skillSourceSchema = z.union([
  z.string().check(
    z.refine((s) => s.startsWith("github:")),
    z.refine((s) => {
      const rest = s.slice("github:".length);
      const parts = rest.split("/");
      return parts.length >= 2 && parts.every((p) => p.length > 0);
    }),
  ),
  z.string().check(z.refine((s) => s.startsWith("git:"))),
  z.string().check(z.refine((s) => s.startsWith("path:"))),
  z.string().check(z.refine((s) => /^@[\w-]+\/[\w-]+$/.test(s))),
]);

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

export const agentsConfigSchema = z.object({
  version: z.literal(1),
  project: projectConfigSchema.optional(),
  symlinks: symlinksConfigSchema.optional(),
  skills: z.record(z.string(), skillDependencySchema).default({}),
});

export type AgentsConfig = z.infer<typeof agentsConfigSchema>;
