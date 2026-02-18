function Terminal({ children }: { children: React.ReactNode }) {
  return (
    <div className="terminal">
      <div className="terminal-header">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
      </div>
      <div className="terminal-body">{children}</div>
    </div>
  );
}

function CommandCard({
  name,
  synopsis,
  children,
}: {
  name: string;
  synopsis: string;
  children: React.ReactNode;
}) {
  return (
    <div className="command-card">
      <h3>{name}</h3>
      <div className="synopsis">{synopsis}</div>
      <p>{children}</p>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <div className="hero">
        <p className="tagline">Package Manager for .agents</p>
        <p className="tagline-sub">
          Declare skill dependencies in <code>agents.toml</code>, lock versions
          for reproducibility, and let every tool discover skills from one place.
        </p>
        <div className="cta-buttons">
          <a href="#quick-start" className="btn btn-primary">
            Get Started
          </a>
          <a
            href="https://github.com/getsentry/dotagents"
            className="btn btn-secondary"
          >
            GitHub
          </a>
        </div>
      </div>

      <section className="section" id="why">
        <h2>Why dotagents?</h2>
        <div className="feature-grid">
          <div className="feature">
            <h3>One source of truth</h3>
            <p>
              Skills live in <code>.agents/skills/</code> and symlink into{" "}
              <code>.claude/</code>, <code>.cursor/</code>, or wherever your
              tools expect them.
            </p>
          </div>
          <div className="feature">
            <h3>Reproducible</h3>
            <p>
              <code>agents.lock</code> pins exact commits and integrity hashes.{" "}
              <code>--frozen</code> in CI guarantees everyone runs the same
              skills.
            </p>
          </div>
          <div className="feature">
            <h3>Shareable</h3>
            <p>
              Skills are directories with a <code>SKILL.md</code>. Host them in
              any git repo, discover automatically, install with one command.
            </p>
          </div>
          <div className="feature">
            <h3>Multi-agent</h3>
            <p>
              Configure Claude, Cursor, Codex, VS Code, and OpenCode from a
              single <code>agents.toml</code>. Skills, MCP servers, and hooks.
            </p>
          </div>
        </div>
      </section>

      <section className="steps" id="quick-start">
        <h2>Quick Start</h2>

        <div className="step">
          <h3>Initialize</h3>
          <p>Create an agents.toml and .agents/ directory in your project.</p>
          <Terminal>
            <pre>
              <code className="cli">
                <span className="cli-dim">$</span> npx @sentry/dotagents init
                --agents claude{"\n\n"}
                <span className="cli-green">Created</span> agents.toml{"\n"}
                <span className="cli-green">Created</span> .agents/skills/
                {"\n"}
                <span className="cli-green">Created</span> symlink:
                .claude/skills/ → .agents/skills/{"\n\n"}
                <span className="cli-bold">Next steps:</span>
                {"\n"}
                {"  "}1. Add skills:{" "}
                <span className="cli-cyan">
                  dotagents add getsentry/skills --name find-bugs
                </span>
                {"\n"}
                {"  "}2. Install:{" "}
                <span className="cli-cyan">dotagents install</span>
              </code>
            </pre>
          </Terminal>
        </div>

        <div className="step">
          <h3>Add a skill</h3>
          <p>Install a skill from any GitHub repo.</p>
          <Terminal>
            <pre>
              <code className="cli">
                <span className="cli-dim">$</span> npx @sentry/dotagents add
                getsentry/skills --name find-bugs{"\n\n"}
                <span className="cli-green">✓</span>{" "}
                <span className="cli-bold">find-bugs</span>{" "}
                <span className="cli-dim">added from</span> getsentry/skills
                {"\n"}
                <span className="cli-dim">  commit</span> c888156{"\n"}
                <span className="cli-dim">  integrity</span>{" "}
                sha256-FWmCLd...
              </code>
            </pre>
          </Terminal>
        </div>

        <div className="step">
          <h3>That&apos;s it</h3>
          <p>
            Your <code>agents.toml</code> now declares the dependency, and{" "}
            <code>agents.lock</code> pins it.
          </p>
          <Terminal>
            <pre>
              <code className="cli">
                <span className="cli-dim"># agents.toml</span>
                {"\n"}version = 1{"\n"}agents = [&quot;claude&quot;]{"\n\n"}
                [[skills]]{"\n"}name = &quot;find-bugs&quot;{"\n"}source =
                &quot;getsentry/skills&quot;
              </code>
            </pre>
          </Terminal>
        </div>
      </section>

      <section className="section" id="source-formats">
        <h2>Source Formats</h2>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Example</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>GitHub</strong>
              </td>
              <td>
                <code>getsentry/skills</code>
              </td>
              <td>Auto-discovers skills by name</td>
            </tr>
            <tr>
              <td>
                <strong>Pinned</strong>
              </td>
              <td>
                <code>getsentry/skills@v1.0.0</code>
              </td>
              <td>Locked to a specific ref</td>
            </tr>
            <tr>
              <td>
                <strong>Git URL</strong>
              </td>
              <td>
                <code>git:https://git.corp.dev/repo</code>
              </td>
              <td>Non-GitHub git servers</td>
            </tr>
            <tr>
              <td>
                <strong>Local</strong>
              </td>
              <td>
                <code>path:./my-skills/custom</code>
              </td>
              <td>Local directory, relative to project root</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section" id="commands">
        <h2>Commands</h2>
        <CommandCard name="init" synopsis="dotagents init [--agents claude,cursor] [--force]">
          Initialize a new project with <code>agents.toml</code> and{" "}
          <code>.agents/skills/</code>. Interactive mode prompts for agent
          targets, gitignore preference, and trust policy.
        </CommandCard>
        <CommandCard name="install" synopsis="dotagents install [--frozen] [--force]">
          Install all skill dependencies. Use <code>--frozen</code> in CI to
          fail if the lockfile is out of sync.
        </CommandCard>
        <CommandCard name="add" synopsis="dotagents add <source> [--name <name>] [--ref <ref>]">
          Add a skill dependency and install it. Auto-discovers skills in the
          repo, or use <code>--name</code> to pick one.
        </CommandCard>
        <CommandCard name="remove" synopsis="dotagents remove <name>">
          Remove a skill from <code>agents.toml</code>, delete from disk, and
          update the lockfile.
        </CommandCard>
        <CommandCard name="update" synopsis="dotagents update [name]">
          Update skills to their latest versions. Prints a changelog showing old
          and new commits.
        </CommandCard>
        <CommandCard name="sync" synopsis="dotagents sync">
          Reconcile project state: repair symlinks, verify integrity, adopt
          orphaned skills, regenerate configs.
        </CommandCard>
        <CommandCard name="list" synopsis="dotagents list [--json]">
          Show installed skills with status indicators: <code>✓</code> ok,{" "}
          <code>~</code> modified, <code>✗</code> missing, <code>?</code>{" "}
          unlocked.
        </CommandCard>
      </section>

      <section className="section" id="agents">
        <h2>Agent Targets</h2>
        <p>
          The <code>agents</code> array tells dotagents which tools to
          configure. Each agent gets skill symlinks, MCP server configs, and hook
          configs.
        </p>
        <pre>
          <code>agents = [&quot;claude&quot;, &quot;cursor&quot;]</code>
        </pre>
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Config Dir</th>
              <th>MCP Config</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>claude</code>
              </td>
              <td>
                <code>.claude</code>
              </td>
              <td>
                <code>.mcp.json</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>cursor</code>
              </td>
              <td>
                <code>.cursor</code>
              </td>
              <td>
                <code>.cursor/mcp.json</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>codex</code>
              </td>
              <td>
                <code>.codex</code>
              </td>
              <td>
                <code>.codex/config.toml</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>vscode</code>
              </td>
              <td>
                <code>.vscode</code>
              </td>
              <td>
                <code>.vscode/mcp.json</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>opencode</code>
              </td>
              <td>
                <code>.claude</code>
              </td>
              <td>
                <code>opencode.json</code>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section" id="mcp">
        <h2>MCP Servers</h2>
        <p>
          Declare MCP servers once in <code>agents.toml</code> and dotagents
          generates the correct config file for each agent.
        </p>
        <pre>
          <code>{`# Stdio transport
[[mcp]]
name = "github"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = ["GITHUB_TOKEN"]

# HTTP transport
[[mcp]]
name = "remote-api"
url = "https://mcp.example.com/sse"
headers = { Authorization = "Bearer tok" }`}</code>
        </pre>
      </section>

      <section className="section" id="hooks">
        <h2>Hooks</h2>
        <p>
          Declare hooks once and dotagents writes the correct hook config for
          each agent that supports them.
        </p>
        <pre>
          <code>{`[[hooks]]
event = "PreToolUse"
matcher = "Bash"
command = "my-lint-check"

[[hooks]]
event = "Stop"
command = "notify-done"`}</code>
        </pre>
        <p>
          Supported events: <code>PreToolUse</code>, <code>PostToolUse</code>,{" "}
          <code>UserPromptSubmit</code>, <code>Stop</code>.
        </p>
      </section>
    </>
  );
}
