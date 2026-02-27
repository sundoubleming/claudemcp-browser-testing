import { z } from 'zod';
import { evaluateInBrowser } from '../cdp-client.js';

export const evaluateJsSchema = {
  expression: z
    .string()
    .describe(
      'JavaScript expression to evaluate in the browser page context. Use an IIFE for multi-statement code.'
    ),
};

export async function handleEvaluateJs(args: {
  expression: string;
}): Promise<string> {
  try {
    const result = await evaluateInBrowser(args.expression);
    return JSON.stringify(
      {
        result,
        type: typeof result,
      },
      null,
      2
    );
  } catch (error: any) {
    return JSON.stringify(
      {
        error: error.message,
      },
      null,
      2
    );
  }
}
