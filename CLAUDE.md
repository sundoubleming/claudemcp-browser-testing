# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides browser automation and testing capabilities through Chrome DevTools Protocol (CDP). It allows AI assistants to interact with a running Chrome browser to execute API calls, inspect page state, download files, and run JavaScript.

## Development Commands

```bash
# Run in development mode (uses tsx for TypeScript execution)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run compiled version
npm start
```

## Architecture

### Core Components

**Connection Management (`src/cdp-client.ts`)**
- Maintains a singleton CDP connection to Chrome browser
- Auto-reconnects using last known host/port if connection drops
- Handles target selection (finds appropriate browser tab)
- Filters out DevTools and internal Chrome pages
- Supports targeting specific URLs when connecting

**MCP Server (`src/index.ts`)**
- Registers 5 tools for browser interaction
- Uses `@modelcontextprotocol/sdk` for MCP protocol
- Communicates via stdio transport

**Tool Implementations (`src/tools/`)**
- `connect.ts` - Establish CDP connection to Chrome (must be called first)
- `api-call.ts` - Execute HTTP requests in browser context
- `page-context.ts` - Retrieve current page URL, title, cookies
- `download.ts` - Download and parse files (CSV, JSON, XLSX)
- `evaluate.ts` - Execute arbitrary JavaScript in browser context

**Utilities (`src/utils/`)**
- `file-parser.ts` - Parse CSV, JSON, XLSX files with preview and structure info

### Key Design Patterns

**Connection State**
- Connection persists across tool calls
- Reconnects automatically if disconnected
- Validates connection before each operation
- Throws clear error if not connected

**File Inspection**
- Limits preview to 1MB to prevent memory issues
- Auto-detects format from content-type or filename
- Provides structured metadata (columns, row counts, samples)
- Handles parse errors gracefully

## Browser Setup

The browser must be launched with remote debugging enabled:

```bash
# Chrome/Chromium
google-chrome --remote-debugging-port=9222

# Edge
msedge --remote-debugging-port=9222
```

Default connection: `localhost:9222`

## Important Implementation Notes

- All user inputs in `execute_api_call` are JSON-serialized before injection to prevent JS injection attacks
- The CDP client enables both `Runtime` and `Network` domains on connection
- File downloads use the browser's fetch API, not direct CDP network interception
- The `evaluate_js` tool allows unrestricted code execution - use with caution
- Connection state is module-level singleton, not per-request
