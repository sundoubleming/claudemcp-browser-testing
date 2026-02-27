import { z } from 'zod';
import { evaluateInBrowser } from '../cdp-client.js';
import { parseFileContent } from '../utils/file-parser.js';

export const downloadAndInspectSchema = {
  method: z.enum(['GET', 'POST']).describe('HTTP method'),
  path: z.string().describe('API path for the download endpoint'),
  body: z.record(z.any()).optional().describe('Request body for POST requests'),
  auto_auth: z.boolean().default(true).describe('Automatically inject Authorization header'),
  expected_format: z.enum(['csv', 'xlsx', 'json', 'text']).optional().describe('Expected file format (helps with parsing)'),
};

export async function handleDownloadAndInspect(args: {
  method: string;
  path: string;
  body?: Record<string, any>;
  auto_auth: boolean;
  expected_format?: string;
}): Promise<string> {
  // Safely serialize all user inputs to prevent JS injection
  const safeMethod = JSON.stringify(args.method);
  const safePath = JSON.stringify(args.path);
  const safeBody = JSON.stringify(args.body ?? null);
  const safeExpectedFormat = JSON.stringify(args.expected_format || '');
  const autoAuth = args.auto_auth;

  const js = `
(async function() {
  const method = ${safeMethod};
  const path = ${safePath};
  const bodyParam = ${safeBody};
  const expectedFormat = ${safeExpectedFormat};
  const autoAuth = ${autoAuth};

  const headers = {};

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

  if (bodyParam !== null && method === 'POST') {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(bodyParam);
  }

  try {
    const resp = await fetch(path, fetchOptions);

    if (!resp.ok) {
      const text = await resp.text();
      return JSON.stringify({
        success: false,
        status: resp.status,
        error: text.substring(0, 2000),
      });
    }

    // Check if response is actually a file
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json') && expectedFormat !== 'json') {
      const jsonBody = await resp.json();
      return JSON.stringify({
        success: false,
        error: 'Expected file download but received JSON response',
        response_body: jsonBody,
        content_type: ct,
      });
    }

    const disposition = resp.headers.get('content-disposition') || '';

    let filename = 'download';
    const filenameMatch = disposition.match(/filename[*]?=(?:UTF-8''|"?)([^";\\n]+)"?/i);
    if (filenameMatch) {
      filename = decodeURIComponent(filenameMatch[1]);
    }

    const buffer = await resp.arrayBuffer();
    let bytes = new Uint8Array(buffer);
    const MAX_SIZE = 1024 * 1024;
    if (bytes.length > MAX_SIZE) {
      bytes = bytes.slice(0, MAX_SIZE);
    }

    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    return JSON.stringify({
      success: true,
      filename: filename,
      content_type: ct,
      size: bytes.length,
      data_base64: base64,
      auth_injected: _authInjected,
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: err.message,
    });
  }
})()
  `.trim();

  try {
    const resultStr = await evaluateInBrowser(js, true);
    const result = JSON.parse(resultStr as string);

    if (!result.success) {
      return JSON.stringify(result, null, 2);
    }

    const authWarning =
      args.auto_auth && !result.auth_injected
        ? 'No access_token found in localStorage. Please login in the browser first.'
        : undefined;
    delete result.auth_injected;

    const fileBuffer = Buffer.from(result.data_base64, 'base64');
    const fileInfo = parseFileContent(
      fileBuffer,
      result.content_type,
      result.filename,
      args.expected_format
    );

    const response: Record<string, any> = { success: true, ...fileInfo };
    if (authWarning) {
      response.auth_warning = authWarning;
    }

    return JSON.stringify(response, null, 2);
  } catch (error: any) {
    return JSON.stringify({ success: false, error: error.message }, null, 2);
  }
}
