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
2. Add:
```json
{
  "github.copilot.chat.mcp.servers": {
    "snippets-mcp": {
      "command": "node",
      "args": ["path/to/snippets-mcp/dist/stdio.js"]
    }
  }
}
```

### For Claude Desktop
Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):
```json
{
  "mcpServers": {
    "snippets-mcp": {
      "command": "node",
      "args": ["path/to/snippets-mcp/dist/stdio.js"]
    }
  }
}
```

### For Cline VS Code Extension
Add to `.vscode/settings.json`:
```json
{
  "cline.mcpServers": {
    "snippets-mcp": {
      "command": "node",
      "args": ["path/to/snippets-mcp/dist/stdio.js"]
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

## 🧰 Commands

```bash
npm run build          # Build TypeScript
npm start              # Start HTTP server
npm run start:stdio    # Start stdio server
npm test               # Run tests
npm run lint           # Check code with ESLint
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format code with Prettier
```

## ⚙️ Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (default: development)

## 📄 License

MIT
