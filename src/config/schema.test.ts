import { describe, it, expect } from "vitest";
import { agentsConfigSchema } from "./schema.js";

describe("agentsConfigSchema", () => {
  it("parses a minimal valid config", () => {
    const result = agentsConfigSchema.safeParse({ version: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.skills).toEqual({});
    }
  });

  it("parses a full config with all fields", () => {
    const result = agentsConfigSchema.safeParse({
      version: 1,
      project: { name: "test-project" },
      symlinks: { targets: [".claude", ".cursor"] },
      skills: {
        "pdf-processing": {
          source: "anthropics/skills",
          ref: "v1.0.0",
        },
        "my-skill": {
          source: "path:../shared/my-skill",
        },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project?.name).toBe("test-project");
      expect(result.data.symlinks?.targets).toEqual([".claude", ".cursor"]);
      expect(Object.keys(result.data.skills)).toHaveLength(2);
    }
  });

  it("rejects invalid version", () => {
    expect(agentsConfigSchema.safeParse({ version: 2 }).success).toBe(false);
  });

  it("rejects missing version", () => {
    expect(agentsConfigSchema.safeParse({}).success).toBe(false);
  });

  describe("source specifiers", () => {
    const parseSkill = (source: string) =>
      agentsConfigSchema.safeParse({
        version: 1,
        skills: { test: { source } },
      });

    it("accepts owner/repo", () => {
      expect(parseSkill("anthropics/skills").success).toBe(true);
    });

    it("accepts owner/repo@ref", () => {
      expect(parseSkill("anthropics/skills@v1.0.0").success).toBe(true);
    });

    it("accepts owner/repo@sha", () => {
      expect(parseSkill("anthropics/skills@abc123").success).toBe(true);
    });

    it("accepts git: source", () => {
      expect(parseSkill("git:https://example.com/repo.git").success).toBe(true);
    });

    it("accepts path: source", () => {
      expect(parseSkill("path:../relative/dir").success).toBe(true);
    });

    it("rejects bare name without slash", () => {
      expect(parseSkill("just-a-name").success).toBe(false);
    });

    it("rejects owner starting with dash", () => {
      expect(parseSkill("-bad/repo").success).toBe(false);
    });

    it("rejects repo starting with dash", () => {
      expect(parseSkill("owner/-bad").success).toBe(false);
    });

    it("rejects three-part path (not a valid format)", () => {
      expect(parseSkill("a/b/c").success).toBe(false);
    });
  });
});
