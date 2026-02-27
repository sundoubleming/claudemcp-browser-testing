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
    const errorMsg = error.message || 'Unknown error';

    // Provide detailed troubleshooting based on error type
    let troubleshooting = [];

    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect')) {
      troubleshooting.push(
        '1. Start Chrome/Edge with remote debugging enabled:',
        '   Windows: chrome.exe --remote-debugging-port=' + args.port,
        '   macOS: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=' + args.port,
        '   Linux: google-chrome --remote-debugging-port=' + args.port,
        '   Edge: msedge.exe --remote-debugging-port=' + args.port,
        '',
        '2. Check if the browser is actually listening:',
        '   Visit http://' + args.host + ':' + args.port + '/json in another browser',
        '',
        '3. Verify network connectivity:',
        '   - Firewall may be blocking port ' + args.port,
        '',
        '4. If Claude and browser are on different devices, enable port forwarding:',
        '   Windows (run as Administrator):',
        '     netsh interface portproxy add v4tov4 listenport=' + args.port + ' listenaddress=0.0.0.0 connectport=' + args.port + ' connectaddress=127.0.0.1',
        '     netsh advfirewall firewall add rule name="Chrome Debug Port" dir=in action=allow protocol=TCP localport=' + args.port,
        '   Linux:',
        '     sudo iptables -A INPUT -p tcp --dport ' + args.port + ' -j ACCEPT',
        '     Or use SSH tunnel: ssh -L ' + args.port + ':localhost:' + args.port + ' user@remote-host',
        '   macOS:',
        '     Use SSH tunnel: ssh -L ' + args.port + ':localhost:' + args.port + ' user@remote-host'
      );
    } else if (errorMsg.includes('No page targets found')) {
      troubleshooting.push(
        'No browser tabs found. Please:',
        '1. Open at least one regular tab in the browser',
        '2. Avoid using only DevTools or chrome:// pages',
        '3. Navigate to a real website (e.g., https://example.com)'
      );
    } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout')) {
      troubleshooting.push(
        'Connection timeout. Please check:',
        '1. Host IP address is correct: ' + args.host,
        '2. Network connectivity between machines',
        '3. Firewall settings on both machines',
        '4. Browser is running and responsive'
      );
    } else {
      troubleshooting.push(
        'General troubleshooting:',
        '1. Ensure Chrome/Edge is running with --remote-debugging-port=' + args.port,
        '2. Check http://' + args.host + ':' + args.port + '/json is accessible',
        '3. Verify firewall allows connections on port ' + args.port
      );
    }

    return JSON.stringify(
      {
        success: false,
        error: errorMsg,
        troubleshooting: troubleshooting.join('\n'),
      },
      null,
      2
    );
  }
}
