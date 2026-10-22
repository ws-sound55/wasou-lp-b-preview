import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFile(path.join(root, relative), 'utf8');
const errors = [];
const requireText = (text, expected, label) => {
  if (!text.includes(expected)) errors.push(`${label}: ${expected}`);
};
const requireMatch = (text, pattern, label) => {
  if (!pattern.test(text)) errors.push(label);
};

const [home, homeCss, company, companyCss, seminar11, xmlSitemap, htmlSitemap, robots, workflow, packageJson] = await Promise.all([
  read('index.html'),
  read('assets/css/style.css'),
  read('company/index.html'),
  read('company/styles.css'),
  read('seminar11/index.html'),
  read('sitemap.xml'),
  read('sitemap/index.html'),
  read('robots.txt'),
  read('.github/workflows/build-columns.yml'),
  read('package.json'),
]);
const isSearchExcludedPreview = /\bDisallow:\s*\//.test(robots);

// Root: Google's site-name source and the most important brand entry page.
requireText(home, '<link rel="canonical" href="https://wasou-jinji.jp/">', 'root canonical');
requireText(home, '<meta property="og:site_name" content="和奏人事パートナーズ">', 'root OG site name');
requireText(home, '"@type": "WebSite"', 'root WebSite structured data');
requireText(home, '"name": "和奏人事パートナーズ"', 'root preferred site name');
for (const alias of ['和奏人事', 'わそう人事', 'わそうじんじ', 'wasou-jinji.jp']) {
  requireText(home, `"${alias}"`, `root alternateName ${alias}`);
}
requireText(home, '"@type": "Organization"', 'root Organization structured data');
if (isSearchExcludedPreview) {
  requireText(home, '<h1 id="hero-title">', 'preview root semantic page title');
} else {
  requireText(home, '<h1 class="seo-page-title">', 'root semantic page title');
  requireText(homeCss, '.seo-page-title{', 'root semantic title accessibility style');
}

// Human-readable brand reading and the latest seminar are both internally discoverable.
requireText(company, '読み：わそうじんじパートナーズ', 'company brand reading');
requireText(companyCss, '.brand-reading{', 'company brand reading style');
requireText(seminar11, '<link href="https://wasou-jinji.jp/seminar11/" rel="canonical"/>', 'seminar11 canonical');
requireText(seminar11, '先代から引き継いだ経営者のための採用・定着改善セミナー', 'seminar11 descriptive title');
requireText(seminar11, '"@type": "WebPage"', 'seminar11 WebPage structured data');
requireText(htmlSitemap, '<a href="/seminar11/">採用・定着改善セミナー</a>', 'HTML sitemap seminar11 link');

// XML discovery checks are for the production site. The fixed preview is deliberately noindex.
if (isSearchExcludedPreview) {
  requireText(robots, 'Disallow: /', 'preview robots exclusion');
  requireText(home, 'name="robots" content="noindex, nofollow"', 'preview root noindex');
  requireText(seminar11, 'name="robots"', 'preview seminar11 noindex');
} else {
  requireText(robots, 'Sitemap: https://wasou-jinji.jp/sitemap.xml', 'robots sitemap declaration');
  for (const [url, date] of [
    ['https://wasou-jinji.jp/', '2026-10-22'],
    ['https://wasou-jinji.jp/company/', '2026-10-22'],
    ['https://wasou-jinji.jp/seminar11/', '2026-10-22'],
  ]) {
    requireMatch(xmlSitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?<lastmod>${date}</lastmod>`), `sitemap URL and lastmod: ${url}`);
  }
}
requireText(workflow, "- 'scripts/verify-site-seo.mjs'", 'workflow trigger for site SEO verifier');
requireText(workflow, 'run: npm run check:seo', 'workflow site SEO verifier execution');
requireText(packageJson, '"check:seo": "node scripts/verify-site-seo.mjs"', 'package SEO check command');

if (errors.length) {
  console.error('SITE SEO CHECK FAILED:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Sitewide SEO signals verified: root brand aliases, Organization/WebSite data, seminar11 discovery, sitemap, and workflow guardrail.');
