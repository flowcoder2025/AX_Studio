import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { normalizeBlockData } from '@/lib/blocks/schema';

const DB_PATH = path.join(process.cwd(), 'data', 'ax-studio.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'simple',
    status TEXT NOT NULL DEFAULT 'draft',
    hero_style TEXT NOT NULL DEFAULT 'dark',
    input_data TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'claude',
    data TEXT DEFAULT '{}',
    images TEXT DEFAULT '[]',
    videos TEXT DEFAULT '[]',
    visible INTEGER NOT NULL DEFAULT 1,
    multi_lang_data TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pipeline_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    progress INTEGER NOT NULL DEFAULT 0,
    current_step TEXT DEFAULT '',
    errors TEXT DEFAULT '[]',
    started_at INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS outputs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    platform TEXT,
    file_path TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    include_copy INTEGER NOT NULL DEFAULT 0,
    blocks_json TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_blocks_project ON blocks(project_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_pipeline_project ON pipeline_runs(project_id);
  CREATE INDEX IF NOT EXISTS idx_outputs_project ON outputs(project_id);
`);

// Migrations (기존 DB 호환 — 컬럼 없으면 추가, 있으면 무시)
try { db.exec(`ALTER TABLE blocks ADD COLUMN multi_lang_data TEXT`); } catch {}
try { db.exec(`ALTER TABLE templates ADD COLUMN blocks_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE templates ADD COLUMN include_copy INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE projects ADD COLUMN theme_id TEXT DEFAULT 'clean-white'`); } catch {}

// Gallery items 테이블 (생성소 결과물)
db.exec(`
  CREATE TABLE IF NOT EXISTS gallery_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    workflow TEXT NOT NULL,
    prompt_ko TEXT,
    prompt_en TEXT,
    file_path TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    assigned_block_id TEXT,
    assigned_field TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_gallery_project ON gallery_items(project_id);
`);

// === Project CRUD ===

export function createProject(id: string, name: string, category: string, mode: string, inputData?: any): void {
  db.prepare(
    `INSERT INTO projects (id, name, category, mode, input_data) VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, category, mode, JSON.stringify(inputData || {}));
}

export function getProject(id: string) {
  return db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as any;
}

export function listProjects(limit = 50, offset = 0) {
  return db.prepare(
    `SELECT * FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset) as any[];
}

export function updateProjectStatus(id: string, status: string): void {
  db.prepare(
    `UPDATE projects SET status = ?, updated_at = unixepoch() WHERE id = ?`
  ).run(status, id);
}

export function deleteProject(id: string): void {
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}

// === Block CRUD ===

export function saveBlocks(projectId: string, blocks: any[]): void {
  const del = db.prepare(`DELETE FROM blocks WHERE project_id = ?`);
  const ins = db.prepare(
    `INSERT INTO blocks (id, project_id, type, sort_order, source, data, images, videos, visible, multi_lang_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    del.run(projectId);
    for (const b of blocks) {
      // style/elementStyles를 data JSON 안에 병합하여 저장 (DB 스키마 변경 불필요)
      const dataForStorage = { ...(b.data || {}) };
      if (b.style && Object.keys(b.style).length > 0) dataForStorage.__style = b.style;
      if (b.elementStyles && Object.keys(b.elementStyles).length > 0) dataForStorage.__elementStyles = b.elementStyles;

      ins.run(
        b.id, projectId, b.type, b.order, b.source,
        JSON.stringify(dataForStorage), JSON.stringify(b.images),
        JSON.stringify(b.videos), b.visible ? 1 : 0,
        b.multiLangData ? JSON.stringify(b.multiLangData) : null
      );
    }
  });
  tx();
}

export function getBlocks(projectId: string) {
  const rows = db.prepare(
    `SELECT * FROM blocks WHERE project_id = ? ORDER BY sort_order`
  ).all(projectId) as any[];

  return rows.map(r => {
    const raw = JSON.parse(r.data || '{}');

    // 1. style/elementStyles 추출 (data에서 분리)
    const style = raw.__style || raw.style || undefined;
    const elementStyles = raw.__elementStyles || raw.elementStyles || undefined;
    delete raw.__style; delete raw.__elementStyles;
    delete raw.style; delete raw.elementStyles;

    // 2. 레거시 키 정규화 (schema.ts SSOT 기반)
    const data = normalizeBlockData(r.type, raw);

    return {
      id: r.id,
      type: r.type,
      order: r.sort_order,
      source: r.source,
      data,
      images: JSON.parse(r.images || '[]'),
      videos: JSON.parse(r.videos || '[]'),
      visible: r.visible === 1,
      ...(r.multi_lang_data ? { multiLangData: JSON.parse(r.multi_lang_data) } : {}),
      ...(style ? { style } : {}),
      ...(elementStyles ? { elementStyles } : {}),
    };
  });
}

export function updateBlock(blockId: string, data: any): void {
  db.prepare(
    `UPDATE blocks SET data = ?, updated_at = unixepoch() WHERE id = ?`
  ).run(JSON.stringify(data), blockId);
}

export function reorderBlocks(projectId: string, blockIds: string[]): void {
  const stmt = db.prepare(`UPDATE blocks SET sort_order = ? WHERE id = ? AND project_id = ?`);
  const tx = db.transaction(() => {
    blockIds.forEach((id, i) => stmt.run(i, id, projectId));
  });
  tx();
}

// === Pipeline ===

export function createPipelineRun(id: string, projectId: string): void {
  db.prepare(
    `INSERT INTO pipeline_runs (id, project_id) VALUES (?, ?)`
  ).run(id, projectId);
}

export function updatePipelineRun(id: string, status: string, progress: number, step: string): void {
  db.prepare(
    `UPDATE pipeline_runs SET status = ?, progress = ?, current_step = ?,
     completed_at = CASE WHEN ? IN ('complete', 'error') THEN unixepoch() ELSE NULL END
     WHERE id = ?`
  ).run(status, progress, step, status, id);
}

export function getPipelineRun(id: string) {
  return db.prepare(`SELECT * FROM pipeline_runs WHERE id = ?`).get(id) as any;
}

// === Outputs ===

export function saveOutput(id: string, projectId: string, type: string, platform: string | null, filePath: string, fileSize: number): void {
  // 동일 project+type+platform 레코드가 있으면 교체
  db.prepare(
    `DELETE FROM outputs WHERE project_id = ? AND type = ? AND (platform = ? OR (platform IS NULL AND ? IS NULL))`
  ).run(projectId, type, platform, platform);
  db.prepare(
    `INSERT INTO outputs (id, project_id, type, platform, file_path, file_size)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, projectId, type, platform, filePath, fileSize);
}

export function getOutputs(projectId: string) {
  return db.prepare(`SELECT * FROM outputs WHERE project_id = ? ORDER BY created_at DESC`).all(projectId) as any[];
}

// === Templates ===

export interface TemplateRecord {
  id: string;
  name: string;
  category: string | null;
  include_copy: number;
  blocks_json: string;
  created_at: number;
}

export function saveTemplate(
  id: string,
  name: string,
  category: string | null,
  includeCopy: boolean,
  blocks: any[]
): void {
  // 블록에서 이미지/영상 참조 제거 (프로젝트 고유 데이터)
  const cleaned = blocks.map(b => {
    const entry: any = {
      type: b.type,
      order: b.order,
      source: b.source || 'claude',
      visible: b.visible !== false,
    };
    if (b.style && Object.keys(b.style).length > 0) entry.style = b.style;
    if (b.elementStyles && Object.keys(b.elementStyles).length > 0) entry.elementStyles = b.elementStyles;
    if (includeCopy && b.data && Object.keys(b.data).length > 0) {
      // data에서 모든 이미지/영상 URL 제거 (프로젝트 고유 경로)
      const data = JSON.parse(JSON.stringify(b.data));
      delete data.heroImageUrl; delete data.imageUrl; delete data.videoUrl; delete data.thumbnailUrl;
      // 중첩 배열 내 imageUrl 제거
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          data[key] = data[key].map((item: any) => {
            if (item && typeof item === 'object' && item.imageUrl) {
              const { imageUrl, ...rest } = item;
              return rest;
            }
            return item;
          });
        }
      }
      entry.data = data;
    }
    return entry;
  });
  db.prepare(
    `INSERT INTO templates (id, name, category, include_copy, blocks_json) VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, category, includeCopy ? 1 : 0, JSON.stringify(cleaned));
}

export function listTemplates(): TemplateRecord[] {
  return db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all() as TemplateRecord[];
}

export function getTemplate(id: string): TemplateRecord | null {
  return (db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as TemplateRecord) || null;
}

export function deleteTemplate(id: string): void {
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
}

// === Gallery ===

export interface GalleryItem {
  id: string;
  project_id: string;
  type: 'image' | 'video';
  workflow: string;
  prompt_ko: string | null;
  prompt_en: string | null;
  file_path: string;
  file_size: number;
  width: number | null;
  height: number | null;
  assigned_block_id: string | null;
  assigned_field: string | null;
  created_at: number;
}

export function createGalleryItem(
  id: string,
  projectId: string,
  type: 'image' | 'video',
  workflow: string,
  promptKo: string | null,
  promptEn: string | null,
  filePath: string,
  fileSize: number,
  width?: number,
  height?: number
): void {
  db.prepare(
    `INSERT INTO gallery_items (id, project_id, type, workflow, prompt_ko, prompt_en, file_path, file_size, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, projectId, type, workflow, promptKo, promptEn, filePath, fileSize, width || null, height || null);
}

export function listGalleryItems(projectId: string): GalleryItem[] {
  return db.prepare(
    `SELECT * FROM gallery_items WHERE project_id = ? ORDER BY created_at DESC`
  ).all(projectId) as GalleryItem[];
}

export function getGalleryItem(id: string): GalleryItem | undefined {
  return db.prepare(`SELECT * FROM gallery_items WHERE id = ?`).get(id) as GalleryItem | undefined;
}

export function assignGalleryItem(id: string, blockId: string, field: string): void {
  // 같은 블록+필드에 이미 배정된 항목이 있으면 해제
  db.prepare(
    `UPDATE gallery_items SET assigned_block_id = NULL, assigned_field = NULL
     WHERE assigned_block_id = ? AND assigned_field = ?`
  ).run(blockId, field);
  // 새 배정
  db.prepare(
    `UPDATE gallery_items SET assigned_block_id = ?, assigned_field = ? WHERE id = ?`
  ).run(blockId, field, id);
}

export function unassignGalleryItem(id: string): void {
  db.prepare(
    `UPDATE gallery_items SET assigned_block_id = NULL, assigned_field = NULL WHERE id = ?`
  ).run(id);
}

export function deleteGalleryItem(id: string): void {
  db.prepare(`DELETE FROM gallery_items WHERE id = ?`).run(id);
}

export default db;
