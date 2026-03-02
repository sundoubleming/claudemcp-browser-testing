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
};

export async function handleExecuteApiCall(args: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: Record<string, any> | string;
}): Promise<string> {
  // Safely serialize all user inputs to prevent JS injection
  const safeMethod = JSON.stringify(args.method);
  const safePath = JSON.stringify(args.path);
  const safeHeaders = JSON.stringify(args.headers || {});
  const safeBody = JSON.stringify(args.body ?? null);

  const js = `
(async function() {
  const startTime = Date.now();
  const method = ${safeMethod};
  const path = ${safePath};
  const extraHeaders = ${safeHeaders};
  const bodyParam = ${safeBody};

  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    extraHeaders
  );

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
    return JSON.stringify(result, null, 2);
  } catch (error: any) {
    return JSON.stringify({ error: error.message }, null, 2);
  }
}
