import { evaluateInBrowser } from '../cdp-client.js';

export async function handleGetPageContext(): Promise<string> {
  try {
    const [url, title, cookieStr] = await Promise.all([
      evaluateInBrowser('window.location.href'),
      evaluateInBrowser('document.title'),
      evaluateInBrowser('document.cookie'),
    ]);

    const cookies: Record<string, string> = {};
    if (cookieStr) {
      String(cookieStr)
        .split(';')
        .forEach((pair: string) => {
          const [key, ...vals] = pair.trim().split('=');
          if (key) cookies[key] = vals.join('=');
        });
    }

    return JSON.stringify(
      {
        url,
        title,
        cookies,
      },
      null,
      2
    );
  } catch (error: any) {
    return JSON.stringify({ error: error.message }, null, 2);
  }
}
