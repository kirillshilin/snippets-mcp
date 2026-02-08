# MCP Server Configuration

## For GitHub Copilot in VS Code

1. Open VS Code Settings JSON:
   - Press `Ctrl+Shift+P`
   - Type "Preferences: Open User Settings (JSON)"
   - Press Enter

2. Add the following configuration:

```json
{
  "github.copilot.chat.mcp.servers": {
    "snippets-mcp": {
      "command": "node",
      "args": [
        "c:\\WORK\\DEVELOPMENT\\snippets-mcp\\dist\\stdio.js"
      ]
    }
  }
}
```

3. Restart VS Code

## For Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "snippets-mcp": {
      "command": "node",
      "args": [
        "c:\\WORK\\DEVELOPMENT\\snippets-mcp\\dist\\stdio.js"
      ]
    }
  }
}
```

## For Cline VS Code Extension

Add to `.vscode/settings.json` in your workspace:

```json
{
  "cline.mcpServers": {
    "snippets-mcp": {
      "command": "node",
      "args": [
        "c:\\WORK\\DEVELOPMENT\\snippets-mcp\\dist\\stdio.js"
      ]
    }
  }
}
```

## Testing

To test the stdio server manually:

```powershell
npm run dev:stdio
```

Or with the built version:

```powershell
npm run start:stdio
```

The server will wait for JSON-RPC messages on stdin and respond on stdout.

## Available Tools

- `list_snippets` - List all available code snippets
- `get_snippet` - Get a specific snippet by ID
- `search_snippets` - Search snippets by query

## Available Resources

- `snippet://list` - JSON list of all snippets
