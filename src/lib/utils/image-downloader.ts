import fs from 'fs/promises';
import path from 'path';

export async function downloadScrapedImages(
  imageUrls: string[],
  projectId: string,
  maxImages = 5
): Promise<string[]> {
  const dir = path.join(process.cwd(), 'output', projectId, 'scraped');
  await fs.mkdir(dir, { recursive: true });

  const downloaded: string[] = [];
  for (const url of imageUrls.slice(0, maxImages)) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const filePath = path.join(dir, `img_${downloaded.length}.${ext}`);
      await fs.writeFile(filePath, buf);
      downloaded.push(filePath);
    } catch { /* skip failed downloads */ }
  }
  return downloaded;
}
