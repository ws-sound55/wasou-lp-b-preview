import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const root = process.cwd();
const siteUrl = 'https://wasou-jinji.jp';
const sourceDir = path.join(root, 'content', 'columns');
const columnDir = path.join(root, 'column');
const sitemapPath = path.join(root, 'sitemap.xml');
const htmlSitemapPath = path.join(root, 'sitemap', 'index.html');
const consultationPath = path.join(root, 'consultation.html');
const legalPath = path.join(root, 'tokutei.html');
const previewMode = process.env.INDEXING_CHECK_PREVIEW === 'true';
const categoryMap = new Set([
  'family-governance',
  'philosophy-organization',
  'hr-evaluation',
  'retention-development',
  'recruitment'
]);

const normaliseDate = value => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

const fail = message => {
  console.error(`INDEXING CHECK FAILED: ${message}`);
  process.exitCode = 1;
};

const readPosts = async () => {
  const files = (await fs.readdir(sourceDir)).filter(file => file.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const parsed = matter(await fs.readFile(path.join(sourceDir, file), 'utf8'));
    const data = parsed.data || {};
    if (data.published !== true) continue;
    const slug = String(data.slug || path.basename(file, '.md')).trim();
    const categories = (Array.isArray(data.categories) ? data.categories : [data.categories]).filter(Boolean);
    const publishedAt = normaliseDate(data.published_at);
    const updatedAt = normaliseDate(data.updated_at) || publishedAt;
    if (!slug || !data.title || !publishedAt || categories.length === 0 || !categories.every(category => categoryMap.has(category))) {
      fail(`invalid published front matter in ${file}`);
      continue;
    }
    posts.push({slug, title: String(data.title), categories, updatedAt});
  }
  return posts;
};

const read = file => fs.readFile(file, 'utf8');
const has = (content, expected, label) => {
  if (!content.includes(expected)) fail(`${label}: ${expected}`);
};

const posts = await readPosts();
const [columnIndex, xmlSitemap, htmlSitemap, robots, consultationPage, legalPage] = await Promise.all([
  read(path.join(columnDir, 'index.html')),
  read(sitemapPath),
  read(htmlSitemapPath),
  read(path.join(root, 'robots.txt')),
  read(consultationPath),
  read(legalPath)
]);

if (previewMode) {
  has(robots, 'Disallow: /', 'preview robots exclusion');
} else {
  has(robots, `Sitemap: ${siteUrl}/sitemap.xml`, 'robots.txt sitemap declaration');
}
has(htmlSitemap, '<!-- COLUMN_ARTICLE_LINKS:START -->', 'HTML sitemap start marker');
has(htmlSitemap, '<!-- COLUMN_ARTICLE_LINKS:END -->', 'HTML sitemap end marker');

for (const page of [
  {label:'consultation', route:'/consultation.html', content:consultationPage},
  {label:'tokutei', route:'/tokutei.html', content:legalPage}
]) {
  const canonical = `${siteUrl}${page.route}`;
  has(page.content, `<link rel="canonical" href="${canonical}">`, `${page.label} canonical`);
  has(page.content, '<meta name="description"', `${page.label} description`);
  if (previewMode) {
    has(page.content, '<meta name="robots" content="noindex, nofollow">', `${page.label} preview exclusion`);
  } else {
    has(page.content, '<meta name="robots" content="index,follow">', `${page.label} indexability`);
  }
  has(page.content, '"@type":"WebPage"', `${page.label} WebPage schema`);
  has(xmlSitemap, `<loc>${canonical}</loc>`, `${page.label} XML sitemap URL`);
  has(htmlSitemap, `href="${page.route}"`, `${page.label} HTML sitemap link`);
}

for (const post of posts) {
  const route = `/column/${post.slug}/`;
  const canonical = `${siteUrl}${route}`;
  const articlePath = path.join(columnDir, post.slug, 'index.html');
  const article = await read(articlePath).catch(() => {
    fail(`generated article missing: ${articlePath}`);
    return '';
  });
  const categoryPages = await Promise.all(post.categories.map(category => read(path.join(columnDir, 'category', category, 'index.html')).catch(() => {
    fail(`generated category missing: ${category}`);
    return '';
  })));

  has(article, `<link rel="canonical" href="${canonical}">`, `${post.slug} canonical`);
  has(article, '"@type":"BlogPosting"', `${post.slug} BlogPosting schema`);
  if (previewMode) {
    has(article, '<meta name="robots" content="noindex, nofollow">', `${post.slug} preview exclusion`);
  } else if (article.includes('name="robots" content="noindex')) {
    fail(`${post.slug} must be indexable`);
  }
  has(article, 'href="/sitemap/"', `${post.slug} footer sitemap link`);
  has(columnIndex, `href="${route}"`, `${post.slug} column index link`);
  for (const categoryPage of categoryPages) has(categoryPage, `href="${route}"`, `${post.slug} category link`);
  has(xmlSitemap, `<loc>${canonical}</loc>`, `${post.slug} XML sitemap URL`);
  has(xmlSitemap, `<lastmod>${post.updatedAt}</lastmod>`, `${post.slug} XML sitemap date`);
  has(htmlSitemap, `href="${route}"`, `${post.slug} HTML sitemap link`);
}

for (const category of categoryMap) {
  const categoryPosts = posts.filter(post => post.categories.includes(category));
  if (categoryPosts.length === 0) continue;
  const route = `/column/category/${category}/`;
  const canonical = `${siteUrl}${route}`;
  const categoryPage = await read(path.join(columnDir, 'category', category, 'index.html')).catch(() => {
    fail(`generated category missing: ${category}`);
    return '';
  });
  has(categoryPage, `<link rel="canonical" href="${canonical}">`, `${category} category canonical`);
  has(categoryPage, '"@type":"CollectionPage"', `${category} CollectionPage schema`);
  if (previewMode) {
    has(categoryPage, '<meta name="robots" content="noindex, nofollow">', `${category} category preview exclusion`);
  } else if (categoryPage.includes('name="robots" content="noindex')) {
    fail(`${category} category must be indexable`);
  }
  has(xmlSitemap, `<loc>${canonical}</loc>`, `${category} XML sitemap URL`);
  has(xmlSitemap, '<lastmod>', `${category} XML sitemap update date`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Indexing signals verified for ${posts.length} published column article(s).`);
