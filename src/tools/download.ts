import { z } from 'zod';
import { evaluateInBrowser } from '../cdp-client.js';
import { parseFileContent } from '../utils/file-parser.js';

export const downloadAndInspectSchema = {
  method: z.enum(['GET', 'POST']).describe('HTTP method'),
  path: z.string().describe('API path for the download endpoint'),
  body: z.record(z.any()).optional().describe('Request body for POST requests'),
  headers: z.record(z.string()).optional().describe('Additional HTTP headers'),
  expected_format: z.enum(['csv', 'xlsx', 'json', 'text']).optional().describe('Expected file format (helps with parsing)'),
};

export async function handleDownloadAndInspect(args: {
  method: string;
  path: string;
  body?: Record<string, any>;
  headers?: Record<string, string>;
  expected_format?: string;
}): Promise<string> {
  // Safely serialize all user inputs to prevent JS injection
  const safeMethod = JSON.stringify(args.method);
  const safePath = JSON.stringify(args.path);
  const safeBody = JSON.stringify(args.body ?? null);
  const safeHeaders = JSON.stringify(args.headers || {});
  const safeExpectedFormat = JSON.stringify(args.expected_format || '');

  const js = `
(async function() {
  const method = ${safeMethod};
  const path = ${safePath};
  const bodyParam = ${safeBody};
  const extraHeaders = ${safeHeaders};
  const expectedFormat = ${safeExpectedFormat};

  const headers = Object.assign({}, extraHeaders);

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

    const fileBuffer = Buffer.from(result.data_base64, 'base64');
    const fileInfo = parseFileContent(
      fileBuffer,
      result.content_type,
      result.filename,
      args.expected_format
    );

    return JSON.stringify({ success: true, ...fileInfo }, null, 2);
  } catch (error: any) {
    return JSON.stringify({ success: false, error: error.message }, null, 2);
  }
}
