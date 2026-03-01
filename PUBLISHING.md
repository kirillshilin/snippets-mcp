# 📦 Publishing & Distributing Snippets MCP

This guide explains how to publish **snippets-mcp** to the npm registry and how community members can install and use it.

---

## Table of Contents

1. [For Maintainers – Publishing to npm](#for-maintainers--publishing-to-npm)
   - [Prerequisites](#prerequisites)
   - [Prepare the Package](#prepare-the-package)
   - [Test the Package Locally](#test-the-package-locally)
   - [Publish to npm](#publish-to-npm)
   - [Versioning](#versioning)
2. [For Community Members – Using the Published Package](#for-community-members--using-the-published-package)
   - [Run with npx (no install required)](#run-with-npx-no-install-required)
   - [Install Globally](#install-globally)
   - [Configure in AI Clients](#configure-in-ai-clients)
3. [Docker Distribution](#docker-distribution)

---

## For Maintainers – Publishing to npm

### Prerequisites

- Node.js >= 18.0.0
- An [npm account](https://www.npmjs.com/signup)
- Logged in to npm: `npm login`

### Prepare the Package

1. **Set a meaningful package name** in `package.json`.  
   If you want to publish under an npm organization (e.g., `@your-org/snippets-mcp`) update the `"name"` field accordingly:

   ```json
   {
     "name": "@your-org/snippets-mcp"
   }
   ```

2. **Bump the version** following [Semantic Versioning](https://semver.org/):

   ```bash
   npm version patch   # bug fixes  → 1.0.0 → 1.0.1
   npm version minor   # new feature → 1.0.0 → 1.1.0
   npm version major   # breaking change → 1.0.0 → 2.0.0
   ```

3. **Build the project** (runs automatically via the `prepack` script before `npm pack`/`npm publish`, but you can run it manually):

   ```bash
   npm run build
   ```

4. **Preview what will be included** in the published package:

   ```bash
   npm pack --dry-run
   ```

   The package includes: `dist/`, `README.md`, `PUBLISHING.md`, and `LICENSE`.  
   Users provide their own snippets directory at runtime via the `--snippets-dir` argument or `SNIPPETS_DIR` environment variable.

### Test the Package Locally

Before publishing, verify the package works end-to-end on your local machine:

```bash
# Pack the package into a tarball
npm pack

# Install it globally from the tarball
npm install -g snippets-mcp-*.tgz

# Run the CLI
snippets-mcp

# Or test via npx with the tarball directly
npx ./snippets-mcp-*.tgz
```

Alternatively, use `npm link` to test in another project:

```bash
# In the snippets-mcp directory
npm link

# In a consumer project
npm link snippets-mcp
```

### Publish to npm

Once you are satisfied with local testing:

```bash
# Publish as the latest release
npm publish --access public

# Publish a pre-release (beta, alpha, rc)
npm publish --access public --tag beta
```

> **Note:** The `prepublishOnly` script automatically runs `npm test` and `npm run lint` before publishing to prevent broken releases from reaching the registry.

### Versioning

Use [Semantic Versioning](https://semver.org/):

| Change type | Command | Example |
|---|---|---|
| Patch (bug fix) | `npm version patch` | `1.0.0` → `1.0.1` |
| Minor (new feature, backward compatible) | `npm version minor` | `1.0.0` → `1.1.0` |
| Major (breaking change) | `npm version major` | `1.0.0` → `2.0.0` |
| Pre-release | `npm version prerelease --preid=beta` | `1.0.0` → `1.0.1-beta.0` |

---

## For Community Members – Using the Published Package

### Run with npx (no install required)

The quickest way to try snippets-mcp without installing anything:

```bash
npx snippets-mcp
```

You can also point it at a custom snippets directory:

```bash
npx snippets-mcp --snippets-dir /path/to/your/snippets
```

### Install Globally

```bash
npm install -g snippets-mcp
snippets-mcp   # runs the stdio MCP server
```

### Configure in AI Clients

Once installed globally or used via `npx`, configure your AI client to use the server.

#### GitHub Copilot in VS Code

1. Press `Ctrl+Shift+P` → **Preferences: Open User Settings (JSON)**
2. Add:

```json
{
  "github.copilot.chat.mcp.servers": {
    "snippets-mcp": {
      "command": "npx",
      "args": ["-y", "snippets-mcp"]
    }
  }
}
```

#### Claude Desktop

Edit the config file for your OS:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "snippets-mcp": {
      "command": "npx",
      "args": ["-y", "snippets-mcp"]
    }
  }
}
```

#### Cline VS Code Extension

Add to `.vscode/settings.json`:

```json
{
  "cline.mcpServers": {
    "snippets-mcp": {
      "command": "npx",
      "args": ["-y", "snippets-mcp"]
    }
  }
}
```

#### Custom Snippets Directory

Pass `--snippets-dir` to point to your own snippets:

```json
{
  "command": "npx",
  "args": ["-y", "snippets-mcp", "--snippets-dir", "/path/to/your/snippets"]
}
```

---

## Docker Distribution

You can also distribute snippets-mcp as a Docker image for users who prefer containers.

### Build the Image

```bash
docker build -t snippets-mcp .
```

### Run via Docker

```bash
# Stdio transport (for MCP clients that spawn a process)
docker run --rm -i snippets-mcp node dist/stdio.js

# Streamable HTTP transport
docker run --rm -p 3003:3003 snippets-mcp node dist/streamable-http.js

# Mount a custom snippets directory
docker run --rm -p 3003:3003 \
  -v /path/to/your/snippets:/app/snippets \
  snippets-mcp node dist/streamable-http.js
```

### Publish to Docker Hub

```bash
docker tag snippets-mcp your-dockerhub-username/snippets-mcp:latest
docker push your-dockerhub-username/snippets-mcp:latest
```

Community members can then run:

```bash
docker pull your-dockerhub-username/snippets-mcp
```
