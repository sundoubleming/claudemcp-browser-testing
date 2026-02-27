import { z } from 'zod';
import { connectToChrome } from '../cdp-client.js';

export const connectBrowserSchema = {
  host: z.string().describe('Windows PC IP address, e.g. "192.168.1.100"'),
  port: z
    .number()
    .default(9222)
    .describe('Chrome remote debugging port (default: 9222)'),
  target_url: z
    .string()
    .optional()
    .describe('Optional URL substring to match a specific tab. If not specified, connects to the first non-internal page tab.'),
};

export async function handleConnectBrowser(args: {
  host: string;
  port: number;
  target_url?: string;
}): Promise<string> {
  try {
    const result = await connectToChrome(args.host, args.port, args.target_url);
    return JSON.stringify(result, null, 2);
  } catch (error: any) {
    return JSON.stringify(
      {
        success: false,
        error: error.message,
        hint: `Make sure Chrome is running with: chrome.exe --remote-debugging-port=${args.port} and the port is accessible from this machine.`,
      },
      null,
      2
    );
  }
}
