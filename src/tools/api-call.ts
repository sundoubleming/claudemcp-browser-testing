import { z } from 'zod';
import { evaluateInBrowser } from '../cdp-client.js';

export const executeApiCallSchema = {
  method: z
    .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    .describe('HTTP method'),
  path: z.string().describe('API path, e.g. "/api/tenant/list"'),
  headers: z
    .record(z.string())
    .optional()
    .describe('Additional HTTP headers'),
  body: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .describe('Request body (object or string)'),
  auto_auth: z
    .boolean()
    .default(true)
    .describe(
      'Automatically inject Authorization header from localStorage (default: true)'
    ),
};

export async function handleExecuteApiCall(args: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: Record<string, any> | string;
  auto_auth: boolean;
}): Promise<string> {
  // Safely serialize all user inputs to prevent JS injection
  const safeMethod = JSON.stringify(args.method);
  const safePath = JSON.stringify(args.path);
  const safeHeaders = JSON.stringify(args.headers || {});
  const safeBody = JSON.stringify(args.body ?? null);
  const autoAuth = args.auto_auth;

  const js = `
(async function() {
  const startTime = Date.now();
  const method = ${safeMethod};
  const path = ${safePath};
  const extraHeaders = ${safeHeaders};
  const bodyParam = ${safeBody};
  const autoAuth = ${autoAuth};

  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    extraHeaders
  );

  let _authInjected = false;
  if (autoAuth) {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
      _authInjected = true;
    }
  }

  const fetchOptions = {
    method: method,
    headers: headers,
  };

  if (bodyParam !== null && method !== 'GET') {
    fetchOptions.body = typeof bodyParam === 'string' ? bodyParam : JSON.stringify(bodyParam);
  }

  try {
    const resp = await fetch(path, fetchOptions);
    const elapsed = Date.now() - startTime;

    const respHeaders = {};
    resp.headers.forEach(function(value, key) {
      respHeaders[key] = value;
    });

    let respBody;
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      respBody = await resp.json();
    } else {
      respBody = await resp.text();
    }

    return JSON.stringify({
      status: resp.status,
      status_text: resp.statusText,
      headers: respHeaders,
      body: respBody,
      response_time_ms: elapsed,
      auth_injected: _authInjected,
    });
  } catch (err) {
    return JSON.stringify({
      error: err.message,
      hint: 'Fetch failed. Check if the API path is correct and the server is running.',
    });
  }
})()
  `.trim();

  try {
    const resultStr = await evaluateInBrowser(js, true);
    const result = JSON.parse(resultStr as string);

    if (result.status === 401) {
      result.auth_warning =
        'Received 401 Unauthorized. The access token may have expired. Please re-login in the browser.';
    }

    if (args.auto_auth && !result.auth_injected) {
      result.auth_warning =
        'No access_token found in localStorage. Please login in the browser first.';
    }
    delete result.auth_injected;

    return JSON.stringify(result, null, 2);
  } catch (error: any) {
    return JSON.stringify({ error: error.message }, null, 2);
  }
}
