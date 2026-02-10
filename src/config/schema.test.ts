import { describe, it, expect } from "vitest";
import { agentsConfigSchema } from "./schema.js";

describe("agentsConfigSchema", () => {
  it("parses a minimal valid config", () => {
    const result = agentsConfigSchema.safeParse({ version: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.gitignore).toBe(true);
      expect(result.data.skills).toEqual([]);
    }
  });

  it("defaults gitignore to true when absent", () => {
    const result = agentsConfigSchema.safeParse({ version: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gitignore).toBe(true);
    }
  });

  it("parses gitignore = true", () => {
    const result = agentsConfigSchema.safeParse({ version: 1, gitignore: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gitignore).toBe(true);
    }
  });

  it("parses gitignore = false", () => {
    const result = agentsConfigSchema.safeParse({ version: 1, gitignore: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gitignore).toBe(false);
    }
  });

  it("parses a full config with all fields", () => {
    const result = agentsConfigSchema.safeParse({
      version: 1,
      project: { name: "test-project" },
      symlinks: { targets: [".claude", ".cursor"] },
      skills: [
        {
          name: "pdf-processing",
          source: "anthropics/skills",
          ref: "v1.0.0",
        },
        {
          name: "my-skill",
          source: "path:../shared/my-skill",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project?.name).toBe("test-project");
      expect(result.data.symlinks?.targets).toEqual([".claude", ".cursor"]);
      expect(result.data.skills).toHaveLength(2);
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
        skills: [{ name: "test", source }],
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

    it("accepts git: source with https", () => {
      expect(parseSkill("git:https://example.com/repo.git").success).toBe(true);
    });

    it("accepts git: source with ssh", () => {
      expect(parseSkill("git:ssh://git@example.com/repo.git").success).toBe(true);
    });

    it("accepts git: source with git@", () => {
      expect(parseSkill("git:git@github.com:owner/repo.git").success).toBe(true);
    });

    it("accepts git: source with absolute path", () => {
      expect(parseSkill("git:/tmp/local-repo").success).toBe(true);
    });

    it("rejects git: source without protocol", () => {
      expect(parseSkill("git:--upload-pack=evil").success).toBe(false);
    });

    it("rejects git: source with bare relative path", () => {
      expect(parseSkill("git:relative/path").success).toBe(false);
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

  describe("skill name validation", () => {
    const parseWithName = (name: string) =>
      agentsConfigSchema.safeParse({
        version: 1,
        skills: [{ name, source: "owner/repo" }],
      });

    it("accepts valid skill names", () => {
      expect(parseWithName("pdf-processing").success).toBe(true);
      expect(parseWithName("my_skill").success).toBe(true);
      expect(parseWithName("skill.v2").success).toBe(true);
      expect(parseWithName("find-bugs").success).toBe(true);
    });

    it("rejects path traversal in skill names", () => {
      expect(parseWithName("../../etc/passwd").success).toBe(false);
      expect(parseWithName("../evil").success).toBe(false);
    });

    it("rejects skill names with slashes", () => {
      expect(parseWithName("foo/bar").success).toBe(false);
    });

    it("rejects skill names starting with dot", () => {
      expect(parseWithName(".hidden").success).toBe(false);
    });

    it("rejects skill names starting with hyphen", () => {
      expect(parseWithName("-bad").success).toBe(false);
    });
  });
});
