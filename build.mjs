/* ბილდის სკრიპტი — mimdevari.js-იდან აწყობს მინიფიცირებულ ვერსიას და ბუკმარკლეტს.
 *
 * გაშვება:  node build.mjs
 * საჭიროებს:  npx terser (ავტომატურად ჩამოიტვირთება)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SRC = 'mimdevari.js';
const MIN = 'mimdevari.min.js';
const BOOKMARKLET = 'bookmarklet.txt';

/* ---------------------------------------------------------------- CSS pass */

/** terser არ ეხება template literal-ის შიგთავსს, ამიტომ CSS-ს ცალკე ვკუმშავთ. */
function squeezeCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // კომენტარები
    .replace(/\s+/g, ' ') // ყველა თეთრი სივრცე -> ერთი ჰარი
    .replace(/\s*([{}:;,>])\s*/g, '$1') // პუნქტუაციის გარშემო
    .replace(/;}/g, '}') // ბოლო წერტილ-მძიმე
    .trim();
}

const source = readFileSync(SRC, 'utf8');

// `const CSS = ` ... `;`  — ბექთიქებში ჩასმული ბლოკი
const cssMatch = source.match(/const CSS = `([\s\S]*?)`;/);
if (!cssMatch) {
  console.error('ვერ მოიძებნა CSS ბლოკი — build.mjs უნდა განახლდეს.');
  process.exit(1);
}

const squeezed = squeezeCss(cssMatch[1]);
if (squeezed.includes('`') || squeezed.includes('${')) {
  console.error('CSS-ში ბექთიქი ან ${} აღმოჩნდა — შეკუმშვა სახიფათოა.');
  process.exit(1);
}

const withTightCss = source.replace(cssMatch[0], 'const CSS = `' + squeezed + '`;');

/* ------------------------------------------------------------- terser pass */

writeFileSync('.build.tmp.js', withTightCss);

execFileSync(
  'npx',
  [
    '--yes',
    'terser@5',
    '.build.tmp.js',
    '--compress',
    'passes=2',
    '--mangle',
    '--format',
    'ascii_only=false',
    '--output',
    MIN,
  ],
  { stdio: 'inherit' }
);

execFileSync('rm', ['.build.tmp.js']);

/* --------------------------------------------------------------- bookmarklet */

const minified = readFileSync(MIN, 'utf8').trim();
const bookmarklet = 'javascript:' + encodeURIComponent(minified);
writeFileSync(BOOKMARKLET, bookmarklet);

/* encodeURIComponent-ს " & < ყველა გაქცეული აქვს, ამიტომ ატრიბუტში უსაფრთხოა */
const PAGE = 'index.html';
const page = readFileSync(PAGE, 'utf8');
const injected = page.replace(
  /(<a[^>]*\bid="bm"[^>]*\bhref=")[^"]*(")/,
  (_, head, tail) => head + bookmarklet + tail
);
if (injected === page) {
  console.error(`${PAGE}-ში id="bm" ლინკი ვერ მოიძებნა — ბუკმარკლეტი არ ჩაისვა.`);
  process.exit(1);
}
writeFileSync(PAGE, injected);

/* ------------------------------------------------------------------ report */

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('');
console.log(`  ${SRC.padEnd(20)} ${kb(source.length)}`);
console.log(`  ${MIN.padEnd(20)} ${kb(minified.length)}`);
console.log(`  ${BOOKMARKLET.padEnd(20)} ${kb(bookmarklet.length)}`);
console.log('');
