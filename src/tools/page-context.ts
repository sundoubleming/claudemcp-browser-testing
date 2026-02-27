import { evaluateInBrowser } from '../cdp-client.js';
import { EXTRACT_AUTH_JS } from '../utils/auth-helper.js';

export async function handleGetPageContext(): Promise<string> {
  try {
    const [url, title, authJson, cookieStr] = await Promise.all([
      evaluateInBrowser('window.location.href'),
      evaluateInBrowser('document.title'),
      evaluateInBrowser(EXTRACT_AUTH_JS),
      evaluateInBrowser('document.cookie'),
    ]);

    const auth = JSON.parse(authJson as string);

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
        auth_token: auth.access_token || null,
        token_expires_at: auth.expires_at || null,
        cookies,
      },
      null,
      2
    );
  } catch (error: any) {
    return JSON.stringify({ error: error.message }, null, 2);
  }
}
