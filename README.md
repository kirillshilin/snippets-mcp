# 📝 Snippets MCP Server

A Model Context Protocol (MCP) server that provides access to code snippets through stdio, HTTP (SSE), and Streamable HTTP transport.

## ✨ Features

- 🔌 MCP server with multiple transport options:
  - **Streamable HTTP** - Modern HTTP transport for VS Code and other MCP clients
  - **SSE (Server-Sent Events)** - Traditional HTTP transport with SSE streaming
  - **Stdio** - Process-based transport for desktop applications
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
npm run dev:streamable-http  # Streamable HTTP server with hot reload
npm run dev:http             # SSE HTTP server with hot reload
npm run dev:stdio            # Stdio server for testing
```

## 🔧 Configuration

### For VS Code with HTTP Transport

To use HTTP transport in VS Code (supported by newer MCP clients):

1. First, start the HTTP server:
```bash
npm run start:streamable-http
```

2. Add to your VS Code settings (Ctrl+Shift+P → "Preferences: Open User Settings (JSON)"):
```json
{
  "mcp.servers": {
    "snippets": {
      "type": "http",
      "url": "http://localhost:3003/mcp"
    }
  }
}
```

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
- Individual snippet content using the path format: `snippet://{keyword0}/{keyword1}/{prefix}`
  - All snippets follow this consistent format
  - Missing keywords are represented as empty strings in the path
  - The prefix is always included as the last segment (unique identifier)
  - Examples:
    - With 2+ keywords: `snippet://loop/iteration/for-loop`
    - With 1 keyword: `snippet://function//arrow-fn` (empty second keyword)
    - With 0 keywords: `snippet:////hello` (both keywords empty)

Each snippet resource provides:
- Title: The snippet name
- Description: What the snippet does
- Content: The actual code snippet
- MIME type: `text/plain`

## 🌐 HTTP API Endpoints

### Streamable HTTP Transport (Recommended)
- `POST /mcp` - MCP request handler (supports both initialization and regular requests)
- `GET /mcp` - SSE stream endpoint for receiving server-initiated messages
- `DELETE /mcp` - Session termination endpoint
- `GET /health` - Server health check

### SSE Transport (Legacy)
- `GET /sse` - SSE connection endpoint
- `POST /messages` - Message posting endpoint
- `GET /health` - Server health check

## 🔍 MCP Inspector

Debug your MCP server with the built-in inspector:

```bash
# Inspect stdio transport (starts the server automatically)
npm run inspect:stdio

# Inspect Streamable HTTP transport (requires server to be running separately)
npm run start:streamable-http  # In one terminal
npm run inspect:streamable-http  # In another terminal

# Inspect HTTP/SSE transport (requires server to be running separately)
npm run start:http        # In one terminal
npm run inspect:http      # In another terminal
```

The inspector provides a web interface to test tools, resources, and other MCP features.

## 🧰 Commands

```bash
npm run build                    # Build TypeScript
npm start                        # Start REST API server
npm run start:stdio              # Start stdio MCP server
npm run start:streamable-http    # Start Streamable HTTP MCP server (recommended)
npm run start:http               # Start HTTP/SSE MCP server (legacy)
npm run inspect:stdio            # Inspect stdio MCP server
npm run inspect:streamable-http  # Inspect Streamable HTTP MCP server
npm run inspect:http             # Inspect HTTP/SSE MCP server (requires server running)
npm test                         # Run tests
npm run lint                     # Check code with ESLint
npm run lint:fix                 # Auto-fix ESLint issues
npm run format                   # Format code with Prettier
```

## ⚙️ Environment Variables

These environment variables apply to all servers:

- `PORT` - Server port (default: 3003)
- `HOST` - Server host (default: 127.0.0.1)
- `NODE_ENV` - Environment (default: development)
- `SNIPPETS_DIR` - Directory containing code snippets (default: ./snippets)

**Note**: The REST API server (`npm start`), HTTP/SSE MCP server (`npm run start:http`), and Streamable HTTP MCP server (`npm run start:streamable-http`) share the same configuration. If you need to run them simultaneously, use different ports:
```bash
# Terminal 1: REST API on port 3003
npm start

# Terminal 2: Streamable HTTP MCP on port 3004
PORT=3004 npm run start:streamable-http

# Terminal 3: HTTP/SSE MCP on port 3005
PORT=3005 npm run start:http
```

## 📝 Snippet Formats

The server uses a modular loader architecture following the Open-Closed Principle, making it easy to add new snippet formats without modifying existing code.

### Supported Formats

#### Standard Format (.json)
One snippet per file with metadata and content:
```json
{
  "prefix": "log",
  "title": "Console Log",
  "keywords": ["console", "log", "debug"],
  "scope": "javascript,typescript",
  "description": "Log to console",
  "content": "console.log('${1}');"
}
```

#### VS Code Format (.code-snippet)
Multiple snippets per file, compatible with VS Code's snippet format:
```json
{
  "Print to console": {
    "scope": "javascript,typescript",
    "prefix": "log",
    "body": [
      "console.log('$1');",
      "$2"
    ],
    "description": "Log output to console"
  },
  "Arrow Function": {
    "scope": "javascript,typescript",
    "prefix": "arrowfn",
    "body": [
      "const ${1:name} = (${2:params}) => {",
      "\t$0",
      "}"
    ],
    "description": "Arrow function"
  }
}
```

Both formats can be used simultaneously in the same snippets directory. New formats can be added by implementing the `SnippetLoader` interface.

## 📄 License

MIT
