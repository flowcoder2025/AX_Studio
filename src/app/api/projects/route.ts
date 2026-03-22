import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

// GET /api/projects — list all projects
export async function GET() {
  try {
    const projects = db.listProjects();
    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/projects — create new project
export async function POST(req: NextRequest) {
  try {
    const { name, category, mode } = await req.json();
    if (!name || !category) {
      return NextResponse.json({ error: 'name and category required' }, { status: 400 });
    }
    const id = uuid();
    db.createProject(id, name, category, mode || 'simple');
    return NextResponse.json({ id, name, category, mode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
