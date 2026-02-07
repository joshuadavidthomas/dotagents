import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { hashDirectory, sha256 } from "./hash.js";

describe("hashDirectory", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "dotagents-hash-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true });
  });

  it("produces a sha256- prefixed hash", async () => {
    await writeFile(join(dir, "SKILL.md"), "# Test Skill\n");
    const hash = await hashDirectory(dir);
    expect(hash).toMatch(/^sha256-.+$/);
  });

  it("is deterministic for same content", async () => {
    await writeFile(join(dir, "a.txt"), "hello");
    await writeFile(join(dir, "b.txt"), "world");
    const hash1 = await hashDirectory(dir);

    // Create same content in a different directory
    const dir2 = await mkdtemp(join(tmpdir(), "dotagents-hash-"));
    await writeFile(join(dir2, "a.txt"), "hello");
    await writeFile(join(dir2, "b.txt"), "world");
    const hash2 = await hashDirectory(dir2);
    await rm(dir2, { recursive: true });

    expect(hash1).toBe(hash2);
  });

  it("changes when file content changes", async () => {
    await writeFile(join(dir, "file.txt"), "v1");
    const hash1 = await hashDirectory(dir);
    await writeFile(join(dir, "file.txt"), "v2");
    const hash2 = await hashDirectory(dir);
    expect(hash1).not.toBe(hash2);
  });

  it("changes when a file is added", async () => {
    await writeFile(join(dir, "a.txt"), "hello");
    const hash1 = await hashDirectory(dir);
    await writeFile(join(dir, "b.txt"), "world");
    const hash2 = await hashDirectory(dir);
    expect(hash1).not.toBe(hash2);
  });

  it("handles nested directories", async () => {
    await mkdir(join(dir, "sub"), { recursive: true });
    await writeFile(join(dir, "sub", "nested.txt"), "deep");
    const hash = await hashDirectory(dir);
    expect(hash).toMatch(/^sha256-.+$/);
  });
});

describe("sha256", () => {
  it("returns a hex string", () => {
    const result = sha256("hello");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    expect(sha256("test")).toBe(sha256("test"));
  });
});
