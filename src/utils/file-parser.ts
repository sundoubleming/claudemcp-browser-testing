import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

const MAX_PREVIEW_BYTES = 1024 * 1024; // 1MB

export interface FileInfo {
  filename: string;
  content_type: string;
  file_size_bytes: number;
  truncated: boolean;
  preview: string;
  csv_info?: {
    columns: string[];
    row_count: number;
    sample_rows: string[][];
  };
  json_info?: {
    record_count: number;
    sample: any;
  };
  xlsx_info?: {
    sheet_names: string[];
    active_sheet: string;
    columns: string[];
    row_count: number;
    sample_rows: any[][];
  };
}

export function parseFileContent(
  data: Buffer | string,
  contentType: string,
  filename: string,
  expectedFormat?: string
): FileInfo {
  const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
  const truncated = size > MAX_PREVIEW_BYTES;
  const format = expectedFormat || guessFormat(contentType, filename);

  let processData: Buffer | string = data;
  if (size > MAX_PREVIEW_BYTES) {
    processData = Buffer.isBuffer(data)
      ? data.subarray(0, MAX_PREVIEW_BYTES)
      : data.substring(0, MAX_PREVIEW_BYTES);
  }

  const info: FileInfo = {
    filename,
    content_type: contentType,
    file_size_bytes: size,
    truncated,
    preview: '',
  };

  if (format === 'csv') {
    return parseCsv(processData, info);
  } else if (format === 'json') {
    return parseJson(processData, info);
  } else if (format === 'xlsx') {
    return parseXlsx(processData, info);
  } else {
    const text = typeof processData === 'string' ? processData : processData.toString('utf-8');
    info.preview = text.substring(0, 2000);
    return info;
  }
}

function guessFormat(contentType: string, filename: string): string {
  if (contentType.includes('csv') || filename.endsWith('.csv')) return 'csv';
  if (contentType.includes('json') || filename.endsWith('.json')) return 'json';
  if (contentType.includes('spreadsheet') || contentType.includes('excel') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'xlsx';
  return 'text';
}

function parseCsv(data: Buffer | string, info: FileInfo): FileInfo {
  const text = typeof data === 'string' ? data : data.toString('utf-8');
  info.preview = text.substring(0, 2000);
  try {
    const records: string[][] = csvParse(text, { relax_column_count: true });
    if (records.length > 0) {
      info.csv_info = {
        columns: records[0],
        row_count: records.length - 1,
        sample_rows: records.slice(1, 6),
      };
    }
  } catch (e: any) {
    info.preview += `\n\n[CSV parse error: ${e.message}]`;
  }
  return info;
}

function parseJson(data: Buffer | string, info: FileInfo): FileInfo {
  const text = typeof data === 'string' ? data : data.toString('utf-8');
  info.preview = text.substring(0, 2000);
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      info.json_info = { record_count: parsed.length, sample: parsed.slice(0, 3) };
    } else {
      info.json_info = { record_count: 1, sample: parsed };
    }
  } catch (e: any) {
    info.preview += `\n\n[JSON parse error: ${e.message}]`;
  }
  return info;
}

function parseXlsx(data: Buffer | string, info: FileInfo): FileInfo {
  try {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    info.xlsx_info = {
      sheet_names: workbook.SheetNames,
      active_sheet: sheetName,
      columns: jsonData.length > 0 ? (jsonData[0] as string[]) : [],
      row_count: Math.max(0, jsonData.length - 1),
      sample_rows: jsonData.slice(1, 6) as any[][],
    };
    info.preview = `XLSX: ${workbook.SheetNames.length} sheet(s), ${info.xlsx_info.row_count} rows`;
  } catch (e: any) {
    info.preview = `[XLSX parse error: ${e.message}]`;
  }
  return info;
}
