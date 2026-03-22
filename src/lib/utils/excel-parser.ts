import * as XLSX from 'xlsx';
import fs from 'fs';

export interface ParsedSpec {
  specs: Record<string, string>;
  reviews?: { rating: number; text: string }[];
  certifications?: string[];
  priceOptions?: { name: string; price: string; description: string }[];
  rawData: Record<string, any>[];
}

export function parseSpecSheet(filePath: string): ParsedSpec {
  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: 'buffer' });

  const result: ParsedSpec = { specs: {}, rawData: [] };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (rows.length === 0) continue;

    const lowerName = sheetName.toLowerCase();

    // 시트명으로 구분
    if (lowerName.includes('리뷰') || lowerName.includes('review')) {
      result.reviews = rows.map(r => ({
        rating: Number(r.rating || r['평점'] || r['별점'] || 5),
        text: String(r.text || r['내용'] || r['리뷰'] || ''),
      })).filter(r => r.text);
      continue;
    }

    if (lowerName.includes('가격') || lowerName.includes('price') || lowerName.includes('옵션')) {
      result.priceOptions = rows.map(r => ({
        name: String(r.name || r['옵션명'] || r['이름'] || ''),
        price: String(r.price || r['가격'] || ''),
        description: String(r.description || r['설명'] || ''),
      })).filter(r => r.name);
      continue;
    }

    if (lowerName.includes('인증') || lowerName.includes('cert')) {
      result.certifications = rows.map(r =>
        String(r.name || r['인증명'] || Object.values(r)[0] || '')
      ).filter(Boolean);
      continue;
    }

    // 기본: 스펙 시트
    const keys = Object.keys(rows[0]);

    // 2열 구조 (항목/값) → specs에 직접 매핑
    if (keys.length === 2) {
      for (const row of rows) {
        const vals = Object.values(row);
        const key = String(vals[0]).trim();
        const val = String(vals[1]).trim();
        if (key && val) result.specs[key] = val;
      }
    } else {
      // 다열 구조 → rawData로 전달 (Claude가 해석)
      result.rawData.push(...rows);
    }
  }

  // rawData가 비어있으면 첫 시트 전체를 넣어줌
  if (result.rawData.length === 0 && Object.keys(result.specs).length === 0) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    result.rawData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet);
  }

  return result;
}
