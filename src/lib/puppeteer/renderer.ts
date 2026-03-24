// Puppeteer Renderer — converts HTML detail pages to long images

import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

// dev 모드 HMR에서 좀비 프로세스 방지 — globalThis에 인스턴스 유지
const globalForPuppeteer = globalThis as unknown as { __browser?: Browser | null };
let browser: Browser | null = globalForPuppeteer.__browser || null;

// Platform-specific widths (in pixels)
const PLATFORM_WIDTHS: Record<string, number> = {
  coupang: 860,
  smartstore: 860,
  elevenst: 780,
  default: 860,
};

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    globalForPuppeteer.__browser = browser;
  }
  return browser;
}

// Render HTML string to a long screenshot image
export async function renderHtmlToImage(
  html: string,
  outputPath: string,
  options?: {
    platform?: string;
    format?: 'png' | 'jpeg';
    quality?: number;
  }
): Promise<string> {
  const br = await getBrowser();
  const page = await br.newPage();

  const width = PLATFORM_WIDTHS[options?.platform || 'default'] || 860;

  await page.setViewport({ width, height: 800 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Wait for images and fonts to load
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        )
    );
  });

  // Get full page height
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);

  // Set viewport to full height for full-page screenshot
  await page.setViewport({ width, height: bodyHeight });

  await page.screenshot({
    path: outputPath,
    type: options?.format || 'png',
    quality: options?.format === 'jpeg' ? (options?.quality || 90) : undefined,
    fullPage: true,
  });

  await page.close();
  return outputPath;
}

// Render HTML file to image
export async function renderFileToImage(
  htmlPath: string,
  outputPath: string,
  options?: { platform?: string; format?: 'png' | 'jpeg' }
): Promise<string> {
  const br = await getBrowser();
  const page = await br.newPage();
  const width = PLATFORM_WIDTHS[options?.platform || 'default'] || 860;

  await page.setViewport({ width, height: 800 });

  // file:// URL로 로드하면 상대 API 경로가 안 되므로 localhost로 접근
  // HTML 파일이 output/ 아래에 있으므로 serve API로 접근
  const relativePath = path.relative(process.cwd(), htmlPath).replace(/\\/g, '/');
  const port = process.env.PORT || '3000';
  const url = `http://localhost:${port}/api/output/serve?path=${relativePath}`;

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width, height: bodyHeight });

  await page.screenshot({
    path: outputPath,
    type: options?.format || 'png',
    quality: options?.format === 'jpeg' ? 90 : undefined,
    fullPage: true,
  });

  await page.close();
  return outputPath;
}

// Scrape a URL — for Mode C (URL Remake)
export async function scrapeUrl(url: string): Promise<{
  html: string;
  screenshot: Buffer;
  images: string[];
  texts: string[];
}> {
  const br = await getBrowser();
  const page = await br.newPage();

  await page.setViewport({ width: 860, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Extract page content
  const html = await page.content();

  // Extract all image URLs
  const images = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => src && !src.startsWith('data:'))
  );

  // Extract text content
  const texts = await page.evaluate(() => {
    const elements = document.querySelectorAll('h1, h2, h3, h4, p, li, td, th, span');
    return Array.from(elements)
      .map((el) => el.textContent?.trim())
      .filter((t): t is string => !!t && t.length > 2);
  });

  // Take full-page screenshot
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 860, height: bodyHeight });
  const screenshot = (await page.screenshot({ fullPage: true })) as Buffer;

  await page.close();
  return { html, screenshot, images, texts };
}

// Cleanup browser on process exit
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    globalForPuppeteer.__browser = null;
  }
}
