import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const projectId = (formData.get('projectId') as string) || uuid();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'output', projectId, 'uploads');
    await fs.mkdir(dir, { recursive: true });

    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = path.join(dir, `product_${i}.${ext}`);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buf);
      paths.push(filePath);
    }

    return NextResponse.json({ projectId, imagePaths: paths });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
