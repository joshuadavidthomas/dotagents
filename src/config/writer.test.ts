import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  addSkillToConfig,
  removeSkillFromConfig,
  generateDefaultConfig,
} from "./writer.js";
import { loadConfig } from "./loader.js";

describe("writer", () => {
  let dir: string;
  let configPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "dotagents-test-"));
    configPath = join(dir, "agents.toml");
    await writeFile(configPath, generateDefaultConfig());
  });

  afterEach(async () => {
    await rm(dir, { recursive: true });
  });

  describe("generateDefaultConfig", () => {
    it("produces valid TOML that parses", async () => {
      const config = await loadConfig(configPath);
      expect(config.version).toBe(1);
      expect(config.skills).toEqual({});
    });
  });

  describe("addSkillToConfig", () => {
    it("adds a skill with source only", async () => {
      await addSkillToConfig(configPath, "pdf", {
        source: "github:anthropics/skills/pdf",
      });

      const config = await loadConfig(configPath);
      expect(config.skills["pdf"]?.source).toBe(
        "github:anthropics/skills/pdf",
      );
    });

    it("adds a skill with source and ref", async () => {
      await addSkillToConfig(configPath, "pdf", {
        source: "github:anthropics/skills/pdf",
        ref: "v1.0.0",
      });

      const config = await loadConfig(configPath);
      expect(config.skills["pdf"]?.ref).toBe("v1.0.0");
    });

    it("adds a skill with source, ref, and path", async () => {
      await addSkillToConfig(configPath, "review", {
        source: "git:https://example.com/repo.git",
        ref: "main",
        path: "skills/review",
      });

      const config = await loadConfig(configPath);
      expect(config.skills["review"]?.source).toBe(
        "git:https://example.com/repo.git",
      );
      expect(config.skills["review"]?.path).toBe("skills/review");
    });

    it("adds multiple skills", async () => {
      await addSkillToConfig(configPath, "a", {
        source: "github:org/repo/a",
      });
      await addSkillToConfig(configPath, "b", {
        source: "github:org/repo/b",
      });

      const config = await loadConfig(configPath);
      expect(Object.keys(config.skills)).toHaveLength(2);
    });
  });

  describe("removeSkillFromConfig", () => {
    it("removes an existing skill", async () => {
      await addSkillToConfig(configPath, "pdf", {
        source: "github:anthropics/skills/pdf",
        ref: "v1.0.0",
      });
      await removeSkillFromConfig(configPath, "pdf");

      const config = await loadConfig(configPath);
      expect(config.skills["pdf"]).toBeUndefined();
    });

    it("preserves other skills when removing one", async () => {
      await addSkillToConfig(configPath, "a", {
        source: "github:org/repo/a",
      });
      await addSkillToConfig(configPath, "b", {
        source: "github:org/repo/b",
      });
      await removeSkillFromConfig(configPath, "a");

      const config = await loadConfig(configPath);
      expect(config.skills["a"]).toBeUndefined();
      expect(config.skills["b"]?.source).toBe("github:org/repo/b");
    });

    it("is a no-op for non-existent skill", async () => {
      const before = await readFile(configPath, "utf-8");
      await removeSkillFromConfig(configPath, "nope");
      const after = await readFile(configPath, "utf-8");
      expect(after).toBe(before);
    });
  });
});
