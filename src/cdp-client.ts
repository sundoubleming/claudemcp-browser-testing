import CDP from 'chrome-remote-interface';

interface CDPConnection {
  client: CDP.Client;
  host: string;
  port: number;
}

let connection: CDPConnection | null = null;
let lastHost: string | null = null;
let lastPort: number | null = null;

export async function connectToChrome(host: string, port: number, targetUrl?: string): Promise<{
  success: boolean;
  browser_info: string;
  page_url: string;
  page_title: string;
}> {
  if (connection && (connection.host !== host || connection.port !== port)) {
    await disconnect();
  }

  if (connection) {
    try {
      const result = await evaluateInBrowser('document.title');
      const { result: urlResult } = await connection.client.Runtime.evaluate({
        expression: 'window.location.href',
        returnByValue: true,
      });
      const currentUrl = urlResult.value as string;

      // If targetUrl is specified and the current page doesn't match, disconnect and reconnect to the correct tab
      if (targetUrl && !currentUrl.includes(targetUrl)) {
        await disconnect();
        // Fall through to reconnect logic below
      } else {
        return {
          success: true,
          browser_info: 'Already connected',
          page_url: currentUrl,
          page_title: result as string,
        };
      }
    } catch {
      connection = null;
    }
  }

  const targets = await CDP.List({ host, port });
  // Filter out DevTools pages and other internal pages
  const pageTargets = targets.filter(
    (t: any) => t.type === 'page' && !t.url.startsWith('devtools://') && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://')
  );
  // If targetUrl is specified, find the matching tab
  let pageTarget;
  if (targetUrl) {
    pageTarget = pageTargets.find((t: any) => t.url.includes(targetUrl));
    if (!pageTarget) {
      // Fallback: try all page targets including internal ones
      pageTarget = targets.find((t: any) => t.type === 'page' && t.url.includes(targetUrl));
    }
  }
  // Fallback to first non-internal page, then any page
  if (!pageTarget) {
    pageTarget = pageTargets[0] || targets.find((t: any) => t.type === 'page');
  }
  if (!pageTarget) {
    throw new Error(
      `No page targets found on ${host}:${port}. Make sure the browser has at least one tab open.`
    );
  }

  const client = await CDP({ host, port, target: pageTarget });

  await client.Runtime.enable();
  await client.Network.enable();

  const { result: titleResult } = await client.Runtime.evaluate({
    expression: 'document.title',
    returnByValue: true,
  });
  const { result: urlResult } = await client.Runtime.evaluate({
    expression: 'window.location.href',
    returnByValue: true,
  });

  const version = await CDP.Version({ host, port });

  connection = { client, host, port };
  lastHost = host;
  lastPort = port;

  client.on('disconnect', () => {
    connection = null;
  });

  return {
    success: true,
    browser_info: `${version.Browser} (Protocol ${version['Protocol-Version']})`,
    page_url: urlResult.value as string,
    page_title: titleResult.value as string,
  };
}

export async function evaluateInBrowser(
  expression: string,
  awaitPromise = true
): Promise<any> {
  const client = await getClient();
  const { result, exceptionDetails } = await client.Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise,
  });

  if (exceptionDetails) {
    const errorMsg =
      exceptionDetails.exception?.description ||
      exceptionDetails.text ||
      'Unknown error';
    throw new Error(`Browser JS error: ${errorMsg}`);
  }

  return result.value;
}

export async function getClient(): Promise<CDP.Client> {
  if (!connection && lastHost !== null && lastPort !== null) {
    await connectToChrome(lastHost, lastPort);
  }
  if (!connection) {
    throw new Error(
      'Not connected to Chrome. Use connect_browser tool first.'
    );
  }
  return connection.client;
}

export function isConnected(): boolean {
  return connection !== null;
}

export async function disconnect(): Promise<void> {
  if (connection) {
    try {
      await connection.client.close();
    } catch {
      // Ignore close errors
    }
    connection = null;
  }
}
