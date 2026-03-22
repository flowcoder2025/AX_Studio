import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const { stdout } = await execFileAsync(ffmpegPath, ['-version'], { timeout: 5000 });
    const versionMatch = stdout.match(/ffmpeg version (\S+)/);
    return NextResponse.json({
      available: true,
      version: versionMatch?.[1] || 'unknown',
      path: ffmpegPath,
    });
  } catch {
    return NextResponse.json({
      available: false,
      version: null,
      path: process.env.FFMPEG_PATH || 'ffmpeg',
    });
  }
}
