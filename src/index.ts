import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { connectBrowserSchema, handleConnectBrowser } from './tools/connect.js';
import { executeApiCallSchema, handleExecuteApiCall } from './tools/api-call.js';
import { handleGetPageContext } from './tools/page-context.js';
import { downloadAndInspectSchema, handleDownloadAndInspect } from './tools/download.js';
import { evaluateJsSchema, handleEvaluateJs } from './tools/evaluate.js';

const server = new McpServer({
  name: 'browser-testing',
  version: '1.0.0',
});

server.tool(
  'connect_browser',
  'Connect to a remote Chrome instance running with --remote-debugging-port. Must be called before any other tool.',
  connectBrowserSchema,
  async (args) => ({
    content: [{ type: 'text', text: await handleConnectBrowser(args) }],
  })
);

server.tool(
  'execute_api_call',
  'Execute an API call in the browser context. Uses the page origin as base URL.',
  executeApiCallSchema,
  async (args) => ({
    content: [{ type: 'text', text: await handleExecuteApiCall(args) }],
  })
);

server.tool(
  'get_page_context',
  'Get current browser page info: URL, title, cookies.',
  {},
  async () => ({
    content: [{ type: 'text', text: await handleGetPageContext() }],
  })
);

server.tool(
  'download_and_inspect_file',
  'Download a file from an API endpoint and inspect its contents. Supports CSV, JSON, XLSX formats. Returns file metadata, preview, and parsed structure.',
  downloadAndInspectSchema,
  async (args) => ({
    content: [{ type: 'text', text: await handleDownloadAndInspect(args) }],
  })
);

server.tool(
  'evaluate_js',
  'Execute arbitrary JavaScript in the browser page context. Use for operations not covered by other tools. WARNING: This tool allows unrestricted code execution in the browser - only use with trusted input.',
  evaluateJsSchema,
  async (args) => ({
    content: [{ type: 'text', text: await handleEvaluateJs(args) }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
