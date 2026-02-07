export { loadConfig, ConfigError, agentsConfigSchema } from "./config/index.js";
export type {
  AgentsConfig,
  SkillDependency,
  SymlinksConfig,
  ProjectConfig,
  SkillSource,
} from "./config/index.js";
export { writeAgentsGitignore } from "./gitignore/index.js";
export { ensureSkillsSymlink, verifySymlinks } from "./symlinks/index.js";
