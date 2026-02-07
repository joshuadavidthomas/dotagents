import { describe, it, expect } from "vitest";
import { agentsConfigSchema } from "./schema.js";

describe("agentsConfigSchema", () => {
  it("parses a minimal valid config", () => {
    const result = agentsConfigSchema.safeParse({
      version: 1,
    });
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
          source: "github:anthropics/skills/pdf-processing",
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
    const result = agentsConfigSchema.safeParse({ version: 2 });
    expect(result.success).toBe(false);
  });

  it("rejects missing version", () => {
    const result = agentsConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  describe("source specifiers", () => {
    const parseSkill = (source: string) =>
      agentsConfigSchema.safeParse({
        version: 1,
        skills: { test: { source } },
      });

    it("accepts github: source", () => {
      expect(parseSkill("github:anthropics/skills/pdf").success).toBe(true);
    });

    it("accepts github: source with two parts", () => {
      expect(parseSkill("github:owner/repo").success).toBe(true);
    });

    it("rejects github: with only one part", () => {
      expect(parseSkill("github:onlyowner").success).toBe(false);
    });

    it("accepts git: source", () => {
      expect(parseSkill("git:https://example.com/repo.git").success).toBe(true);
    });

    it("accepts path: source", () => {
      expect(parseSkill("path:../relative/dir").success).toBe(true);
    });

    it("accepts @scope/name source", () => {
      expect(parseSkill("@anthropics/pdf-processing").success).toBe(true);
    });

    it("rejects bare name without prefix", () => {
      expect(parseSkill("just-a-name").success).toBe(false);
    });

    it("rejects @scope without name", () => {
      expect(parseSkill("@anthropics").success).toBe(false);
    });
  });
});
