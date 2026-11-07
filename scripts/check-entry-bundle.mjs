import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const html = await readFile(path.join(distDir, 'index.html'), 'utf8');
const entryMatch = html.match(/<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="([^"]+)")[^>]*>/);

if (!entryMatch) {
  throw new Error('Production entry script was not found in dist/index.html.');
}

const entryPath = path.resolve(distDir, `.${new URL(entryMatch[1], 'http://localhost').pathname}`);
const [entry, entryStats] = await Promise.all([
  readFile(entryPath),
  stat(entryPath),
]);
const gzipBytes = gzipSync(entry).byteLength;
const gzipLimitBytes = 200 * 1024;

console.log(
  `Initial JavaScript entry: ${(entryStats.size / 1024).toFixed(1)} KiB raw, ${(gzipBytes / 1024).toFixed(1)} KiB gzip (budget: 200 KiB gzip).`
);

if (gzipBytes > gzipLimitBytes) {
  throw new Error('Initial JavaScript entry exceeds the 200 KiB gzip performance budget.');
}
