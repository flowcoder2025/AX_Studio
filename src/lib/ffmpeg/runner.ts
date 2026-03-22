// FFmpeg Runner — executes FFmpeg commands for video processing on Windows

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const exec = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

export interface TextOverlay {
  text: string;
  x: string;
  y: string;
  fontsize: number;
  fontcolor: string;
  fontfile?: string;
  startTime: number;
  endTime: number;
  fadeIn?: number;
}

export interface ConcatInput {
  file: string;
  duration?: number;
}

// Encode frames to MP4
export async function framesToVideo(
  framePattern: string,
  outputPath: string,
  fps: number = 24,
  options?: { loop?: number; crf?: number }
): Promise<string> {
  const args = [
    '-y',
    '-framerate', String(fps),
    '-i', framePattern,
    '-c:v', 'libx264',
    '-crf', String(options?.crf || 23),
    '-pix_fmt', 'yuv420p',
    ...(options?.loop !== undefined ? ['-vf', `loop=${options.loop}:size=${fps * 2}:start=0`] : []),
    outputPath,
  ];

  await exec(FFMPEG, args);
  return outputPath;
}

// Add text overlay to video
export async function addTextOverlay(
  inputVideo: string,
  outputPath: string,
  overlays: TextOverlay[]
): Promise<string> {
  const fontFile = overlays[0]?.fontfile || 'C\\:/Windows/Fonts/malgun.ttf';

  const drawTextFilters = overlays.map((o) => {
    const enable = `between(t,${o.startTime},${o.endTime})`;
    const fade = o.fadeIn
      ? `:alpha='if(lt(t-${o.startTime},${o.fadeIn}),(t-${o.startTime})/${o.fadeIn},1)'`
      : '';
    return `drawtext=text='${escapeFFmpegText(o.text)}':fontfile='${fontFile}':fontsize=${o.fontsize}:fontcolor=${o.fontcolor}:x=${o.x}:y=${o.y}:enable='${enable}'${fade}`;
  });

  const filterComplex = drawTextFilters.join(',');

  const args = [
    '-y', '-i', inputVideo,
    '-vf', filterComplex,
    '-c:v', 'libx264', '-crf', '23',
    '-c:a', 'copy',
    outputPath,
  ];

  await exec(FFMPEG, args);
  return outputPath;
}

// Concatenate video clips with transitions
export async function concatWithTransitions(
  inputs: ConcatInput[],
  outputPath: string,
  transition: 'fade' | 'wipe' | 'slide' = 'fade',
  transitionDuration: number = 0.5
): Promise<string> {
  if (inputs.length === 1) {
    // Single input, just copy
    await exec(FFMPEG, ['-y', '-i', inputs[0].file, '-c', 'copy', outputPath]);
    return outputPath;
  }

  // Build xfade filter chain
  const inputArgs = inputs.flatMap((f) => ['-i', f.file]);
  const offsets: number[] = [];
  let cumDuration = 0;

  for (let i = 0; i < inputs.length - 1; i++) {
    const dur = inputs[i].duration || 3;
    cumDuration += dur - transitionDuration;
    offsets.push(cumDuration);
  }

  let filterComplex = '';
  let lastLabel = '[0:v]';

  for (let i = 0; i < inputs.length - 1; i++) {
    const nextLabel = `[${i + 1}:v]`;
    const outLabel = i < inputs.length - 2 ? `[v${i}]` : '[outv]';
    filterComplex += `${lastLabel}${nextLabel}xfade=transition=${transition}:duration=${transitionDuration}:offset=${offsets[i]}${outLabel};`;
    lastLabel = outLabel.replace(';', '');
  }

  // Remove trailing semicolon
  filterComplex = filterComplex.replace(/;$/, '');

  const args = [
    '-y',
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-c:v', 'libx264', '-crf', '23',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  await exec(FFMPEG, args);
  return outputPath;
}

// Create KPI count-up animation video
export async function createKpiCountUp(
  value: number,
  label: string,
  outputPath: string,
  duration: number = 3,
  options?: { width?: number; height?: number; bgColor?: string; textColor?: string }
): Promise<string> {
  const w = options?.width || 1080;
  const h = options?.height || 1080;
  const bgColor = options?.bgColor || '0x0a0a0a';
  const textColor = options?.textColor || 'white';
  const fps = 30;

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=${bgColor}:s=${w}x${h}:d=${duration}:r=${fps}`,
    '-vf', `drawtext=text='%{eif\\:min(${value}\\,${value}*t/${duration * 0.7})\\:d}':fontsize=120:fontcolor=${textColor}:x=(w-text_w)/2:y=(h-text_h)/2-40:fontfile=C\\:/Windows/Fonts/malgun.ttf,drawtext=text='${escapeFFmpegText(label)}':fontsize=36:fontcolor=gray:x=(w-text_w)/2:y=(h-text_h)/2+60:fontfile=C\\:/Windows/Fonts/malgun.ttf`,
    '-c:v', 'libx264', '-crf', '23',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  await exec(FFMPEG, args);
  return outputPath;
}

// Convert video to GIF
export async function videoToGif(
  inputVideo: string,
  outputPath: string,
  options?: { width?: number; fps?: number }
): Promise<string> {
  const w = options?.width || 480;
  const fps = options?.fps || 15;

  // Two-pass for better quality
  const paletteFile = outputPath.replace('.gif', '_palette.png');

  await exec(FFMPEG, [
    '-y', '-i', inputVideo,
    '-vf', `fps=${fps},scale=${w}:-1:flags=lanczos,palettegen`,
    paletteFile,
  ]);

  await exec(FFMPEG, [
    '-y', '-i', inputVideo, '-i', paletteFile,
    '-lavfi', `fps=${fps},scale=${w}:-1:flags=lanczos [x]; [x][1:v] paletteuse`,
    outputPath,
  ]);

  return outputPath;
}

// Escape special characters for FFmpeg drawtext
function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "\\\\'")
    .replace(/:/g, '\\\\:')
    .replace(/%/g, '%%');
}

// Check FFmpeg availability
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await exec(FFMPEG, ['-version']);
    return true;
  } catch {
    return false;
  }
}
