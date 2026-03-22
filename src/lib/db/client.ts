import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
    category TEXT NOT NULL,
    block_types TEXT NOT NULL,
    block_data TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_blocks_project ON blocks(project_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_pipeline_project ON pipeline_runs(project_id);
  CREATE INDEX IF NOT EXISTS idx_outputs_project ON outputs(project_id);
`);

// === Project CRUD ===

export function createProject(id: string, name: string, category: string, mode: string): void {
  db.prepare(
    `INSERT INTO projects (id, name, category, mode) VALUES (?, ?, ?, ?)`
  ).run(id, name, category, mode);
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
    `INSERT INTO blocks (id, project_id, type, sort_order, source, data, images, videos, visible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    del.run(projectId);
    for (const b of blocks) {
      ins.run(
        b.id, projectId, b.type, b.order, b.source,
        JSON.stringify(b.data), JSON.stringify(b.images),
        JSON.stringify(b.videos), b.visible ? 1 : 0
      );
    }
  });
  tx();
}

export function getBlocks(projectId: string) {
  const rows = db.prepare(
    `SELECT * FROM blocks WHERE project_id = ? ORDER BY sort_order`
  ).all(projectId) as any[];

  return rows.map(r => ({
    id: r.id,
    type: r.type,
    order: r.sort_order,
    source: r.source,
    data: JSON.parse(r.data || '{}'),
    images: JSON.parse(r.images || '[]'),
    videos: JSON.parse(r.videos || '[]'),
    visible: r.visible === 1,
  }));
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
  db.prepare(
    `INSERT INTO outputs (id, project_id, type, platform, file_path, file_size)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, projectId, type, platform, filePath, fileSize);
}

export function getOutputs(projectId: string) {
  return db.prepare(`SELECT * FROM outputs WHERE project_id = ? ORDER BY created_at DESC`).all(projectId) as any[];
}

// === Templates ===

export function saveTemplate(id: string, name: string, category: string, blockTypes: string[], blockData: any): void {
  db.prepare(
    `INSERT INTO templates (id, name, category, block_types, block_data) VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, category, JSON.stringify(blockTypes), JSON.stringify(blockData));
}

export function listTemplates() {
  return db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all() as any[];
}

export function getTemplate(id: string) {
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;
}

export function deleteTemplate(id: string): void {
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
}

export default db;
