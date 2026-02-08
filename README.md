# Snippets MCP Server

A Model Context Protocol (MCP) server that provides HTTP access to code snippets.

## Features

- MCP server implementation with HTTP transport
- Code snippets management
- TypeScript with strictest compiler settings
- ESLint and Prettier configured
- Jest for unit testing
- Windows CRLF line endings

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run in development mode with hot reload
npm run dev

# Start the server
npm start
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

## Project Structure

```
snippets-mcp/
├── src/
│   ├── index.ts              # Application entry point
│   ├── server.ts             # Express server setup
│   ├── config.ts             # Configuration
│   ├── mcp/
│   │   └── server.ts         # MCP server implementation
│   ├── services/
│   │   └── snippet-service.ts # Snippet management service
│   └── types/
│       └── snippet.ts        # Type definitions
├── tests/
│   └── snippet-service.test.ts # Unit tests
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .eslintrc.json
├── .prettierrc.json
└── README.md
```

## API Endpoints

### Health Check
- `GET /health` - Server health check

### MCP Endpoint
- `POST /mcp` - MCP request handler

## MCP Tools

- `list_snippets` - List all available code snippets
- `get_snippet` - Get a specific code snippet by ID
- `search_snippets` - Search for snippets by language or tag

## MCP Resources

The server registers all snippets as MCP resources:

- `snippet://list` - List of all available code snippets metadata
- `snippet://{prefix}` - Individual snippet content (e.g., `snippet://hello`, `snippet://for`)

Each snippet resource provides:
- Title: The snippet name
- Description: What the snippet does
- Content: The actual code snippet
- MIME type: `text/plain`

## Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (default: development)

## License

MIT
