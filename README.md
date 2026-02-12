# 📝 Snippets MCP Server

A Model Context Protocol (MCP) server that provides access to code snippets through stdio and HTTP transport.

## ✨ Features

- 🔌 MCP server with stdio and HTTP transport
- 📚 Code snippets management
- 🔒 TypeScript with strictest compiler settings
- ✅ ESLint and Prettier configured
- 🧪 Jest for unit testing

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0

### Installation
```bash
npm install
npm run build
```

### Development
```bash
npm run dev              # HTTP server with hot reload
npm run dev:stdio        # Stdio server for testing
```

## 🔧 Configuration

### For GitHub Copilot in VS Code
1. Press `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"
2. Add (replace with your actual path):
```json
{
  "github.copilot.chat.mcp.servers": {
    "snippets-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/snippets-mcp/dist/stdio.js"]
    }
  }
}
```

### For Claude Desktop
Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) with your actual path:
```json
{
  "mcpServers": {
    "snippets-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/snippets-mcp/dist/stdio.js"]
    }
  }
}
```

### For Cline VS Code Extension
Add to `.vscode/settings.json` (replace with your actual path):
```json
{
  "cline.mcpServers": {
    "snippets-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/snippets-mcp/dist/stdio.js"]
    }
  }
}
```

## 🛠️ Available Tools

- `list_snippets` - List all available code snippets
- `get_snippet` - Get a specific snippet by ID
- `search_snippets` - Search snippets by query

## 📦 Available Resources

- `snippet://list` - JSON list of all snippets
- `snippet://{prefix}` - Individual snippet content (e.g., `snippet://hello`, `snippet://for`)

Each snippet resource provides:
- Title: The snippet name
- Description: What the snippet does
- Content: The actual code snippet
- MIME type: `text/plain`
### For Cline VS Code Extension
Add to `.vscode/settings.json` (replace with your actual path):
```json
{
  "cline.mcpServers": {
    "snippets-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/snippets-mcp/dist/stdio.js"]
    }
  }
}
```

## 🛠️ Available Tools

- `list_snippets` - List all available code snippets
- `get_snippet` - Get a specific snippet by ID
- `search_snippets` - Search snippets by query

## 📦 Available Resources

- `snippet://list` - JSON list of all snippets

## 🌐 HTTP API Endpoints

- `GET /health` - Server health check
- `POST /mcp` - MCP request handler

## 🔍 MCP Inspector

Debug your MCP server with the built-in inspector:

```bash
# Inspect stdio transport (starts the server automatically)
npm run inspect:stdio

# Inspect HTTP/SSE transport (requires server to be running separately)
npm run start:http        # In one terminal
npm run inspect:http      # In another terminal
```

The inspector provides a web interface to test tools, resources, and other MCP features.

## 🧰 Commands

```bash
npm run build          # Build TypeScript
npm start              # Start REST API server
npm run start:stdio    # Start stdio MCP server
npm run start:http     # Start HTTP/SSE MCP server
npm run inspect:stdio  # Inspect stdio MCP server
npm run inspect:http   # Inspect HTTP/SSE MCP server (requires server running)
npm test               # Run tests
npm run lint           # Check code with ESLint
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format code with Prettier
```

## ⚙️ Environment Variables

- `PORT` - Server port (default: 3003)
- `HOST` - Server host (default: 127.0.0.1)
- `NODE_ENV` - Environment (default: development)

## 📄 License

MIT
