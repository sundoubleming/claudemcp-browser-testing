import { z } from 'zod';
import { connectToChrome } from '../cdp-client.js';

// Default values from environment variables or built-in defaults
const DEFAULT_BROWSER_HOST = process.env.BROWSER_TESTING_HOST || 'localhost';
const DEFAULT_BROWSER_PORT = process.env.BROWSER_TESTING_PORT ? parseInt(process.env.BROWSER_TESTING_PORT, 10) : 9222;

export const connectBrowserSchema = {
  host: z
    .string()
    .optional()
    .describe(`Windows PC IP address, e.g. "192.168.1.100". Defaults to env BROWSER_TESTING_HOST or "localhost" (current default: ${DEFAULT_BROWSER_HOST})`),
  port: z
    .number()
    .optional()
    .describe(`Chrome remote debugging port. Defaults to env BROWSER_TESTING_PORT or 9222 (current default: ${DEFAULT_BROWSER_PORT})`),
  target_url: z
    .string()
    .optional()
    .describe('Optional URL substring to match a specific tab. If not specified, connects to the first non-internal page tab.'),
};

export async function handleConnectBrowser(args: {
  host?: string;
  port?: number;
  target_url?: string;
}): Promise<string> {
  // Use provided values or fall back to environment variable defaults
  const host = args.host || DEFAULT_BROWSER_HOST;
  const port = args.port || DEFAULT_BROWSER_PORT;

  try {
    const result = await connectToChrome(host, port, args.target_url);
    return JSON.stringify(result, null, 2);
  } catch (error: any) {
    return JSON.stringify(
      {
        success: false,
        error: error.message,
        hint: `Make sure Chrome is running with: chrome.exe --remote-debugging-port=${port} and the port is accessible from this machine.`,
      },
      null,
      2
    );
  }
}
