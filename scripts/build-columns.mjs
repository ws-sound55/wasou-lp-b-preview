import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const root = process.cwd();
const sourceDir = process.env.COLUMNS_SOURCE || path.join(root, 'content', 'columns');
const outputDir = process.env.COLUMNS_OUTPUT || path.join(root, 'column');
const sitemapPath = process.env.COLUMNS_SITEMAP === 'false' ? null : path.join(root, 'sitemap.xml');
const siteUrl = 'https://wasou-jinji.jp';
const consultationUrl = 'https://reserve.peraichi.com/r/b194f80c/select_date?course=82468';
const categoryMap = {
  'family-governance': '創業家・同族経営',
  'philosophy-organization': '理念・組織づくり',
  'hr-evaluation': '評価・人事制度',
  'retention-development': '定着・育成',
  recruitment: '採用・求人'
};
const services = {
  'family-governance': {label: '創業家・ファミリーガバナンス', href: '/service/#family'},
  'philosophy-values': {label: '経営理念・価値観・行動指針', href: '/service/#philosophy'},
  'hr-system': {label: '人事制度', href: '/service/#hr-system'},
  'retention-development': {label: '定着・育成', href: '/service/#retention'},
  'recruitment-strategy': {label: '採用戦略・求人', href: '/service/#recruitment'}
};
const md = new MarkdownIt({html:false,linkify:true,typographer:true});
const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
const attr = (value = '') => esc(value).replace(/`/g, '&#096;');
const formatDate = value => {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : String(value);
};
const normalizeArray = value => Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
const readPosts = async () => {
  let files = [];
  try { files = await fs.readdir(sourceDir); } catch { return []; }
  const posts = [];
  for (const file of files.filter(file => file.endsWith('.md'))) {
    const raw = await fs.readFile(path.join(sourceDir, file), 'utf8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    if (data.published !== true) continue;
    const slug = String(data.slug || path.basename(file, '.md')).trim();
    const categories = normalizeArray(data.categories).filter(category => categoryMap[category]);
    if (!slug || !data.title || !data.published_at || categories.length === 0) continue;
    posts.push({
      slug,
      title: String(data.title),
      categories,
      published_at: String(data.published_at).slice(0, 10),
      updated_at: data.updated_at ? String(data.updated_at).slice(0, 10) : '',
      intro: String(data.intro || ''),
      excerpt: String(data.excerpt || data.intro || ''),
      eyecatch: String(data.eyecatch || ''),
      ogp_image: String(data.ogp_image || data.eyecatch || '/ogp.png'),
      pickup: data.pickup === true,
      wasou_view: data.wasou_view === true,
      show_article_cta: data.show_article_cta === true,
      related_articles: normalizeArray(data.related_articles),
      related_service: String(data.related_service || ''),
      seo_title: String(data.seo_title || ''),
      seo_description: String(data.seo_description || data.excerpt || data.intro || ''),
      body: parsed.content.trim()
    });
  }
  return posts.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
};
const nav = current => `
<button class="site-menu-trigger" type="button" aria-label="メニューを開く" aria-controls="siteMobileNav" aria-expanded="false"><span></span><span></span><span></span></button>
<nav class="site-mobile-nav" id="siteMobileNav" aria-label="サイトメニュー" hidden><div class="site-mobile-nav-head"><span class="site-mobile-nav-title">MENU</span><button class="site-mobile-nav-close" type="button" aria-label="メニューを閉じる">×</button></div><div class="site-mobile-nav-links"><a href="/">TOPページ</a><a href="/philosophy/">私たちの想い</a><a href="/service/">サービス</a><a href="/family-governance/">ファミリーガバナンス</a><a href="/seminar6/">セミナー</a><a href="/column/"${current === 'column' ? ' aria-current="page"' : ''}>コラム</a><a href="/company/">会社概要</a><a href="/contact/">お問い合わせ</a></div></nav>
<header class="column-site-header"><div class="column-header-inner"><a class="column-brand" href="/" aria-label="和奏人事パートナーズ トップページへ"><img src="/assets/images/logo.png" alt="和奏人事パートナーズ"></a><nav class="column-desktop-nav" aria-label="主要メニュー"><a href="/philosophy/">私たちの想い</a><a href="/service/">サービス</a><a href="/family-governance/">ファミリーガバナンス</a><a href="/seminar6/">セミナー</a><a href="/column/"${current === 'column' ? ' aria-current="page"' : ''}>コラム</a><a href="/company/">会社概要</a><a class="header-contact" href="/contact/">お問い合わせ</a></nav></div></header>`;
const footer = () => `<footer class="column-footer"><div class="column-footer-inner"><div><a href="/" aria-label="和奏人事パートナーズ トップページへ"><img src="/assets/images/logo.png" alt="和奏人事パートナーズ"></a><p>株式会社和装コンサルタンツ<br>〒108-0074 東京都港区高輪2-14-17 グレイス高輪ビル8階<br>TEL 03-6869-6780</p></div><nav aria-label="フッターメニュー"><a href="/philosophy/">私たちの想い</a><a href="/service/">サービス</a><a href="/seminar6/">セミナー</a><a href="/column/">コラム</a><a href="/company/">会社概要</a><a href="/contact/">お問い合わせ</a><a href="/privacy.html">プライバシーポリシー</a></nav></div><nav class="site-footer-menu" aria-label="サイトメニュー"><p class="site-footer-menu-title">サイトメニュー</p><div class="site-footer-menu-links"><a href="/">トップページ</a><a href="/philosophy/">私たちの想い</a><a href="/service/">サービス</a><a href="/family-governance/">ファミリーガバナンス</a><a href="/seminar6/">採用3ステップセミナー</a><a href="/column/">コラム</a><a href="/company/">会社概要</a><a href="/contact/">お問い合わせ</a></div></nav></footer>`;
const layout = ({title, description, canonical, body, structuredData = ''}) => `<!doctype html><html lang="ja"><head><!-- Google Tag Manager --><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KFHHHFDB');</script><!-- End Google Tag Manager --><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${attr(description)}"><link rel="canonical" href="${attr(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(description)}"><meta property="og:url" content="${attr(canonical)}"><meta property="og:image" content="${siteUrl}/ogp.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/css/page-top.css"><link rel="stylesheet" href="/assets/css/site-menu.css"><link rel="stylesheet" href="/assets/css/site-footer-nav.css"><link rel="stylesheet" href="/column/styles.css">${structuredData ? `<script type="application/ld+json">${structuredData}</script>` : ''}<script src="/assets/js/page-top.js" defer></script><script src="/assets/js/site-menu.js" defer></script></head><body class="site-menu-enabled"><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KFHHHFDB" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>${body}<button class="site-page-top" type="button" aria-label="ページ上部へ戻る" title="ページ上部へ戻る"><span aria-hidden="true">↑</span></button></body></html>`;
const tags = post => `<span class="column-tags">${post.categories.map(category => `<span class="column-tag">${esc(categoryMap[category])}</span>`).join('')}</span>`;
const card = post => `<article class="column-card" data-column-card data-categories="${post.categories.join('|')}">${post.eyecatch ? `<a class="column-card-image" href="/column/${attr(post.slug)}/" aria-label="${attr(post.title)}を読む"><img src="${attr(post.eyecatch)}" alt=""></a>` : ''}<div class="column-card-meta"><time datetime="${attr(post.published_at)}">${formatDate(post.published_at)}</time>${tags(post)}${post.wasou_view ? '<span class="column-tag">WASOU VIEW</span>' : ''}</div><h2><a href="/column/${attr(post.slug)}/">${esc(post.title)}</a></h2><p>${esc(post.excerpt)}</p><a class="column-card-link" href="/column/${attr(post.slug)}/">続きを読む</a></article>`;
const breadcrumb = (items) => `<nav class="column-breadcrumb" aria-label="パンくずリスト">${items.map((item, index) => index === items.length - 1 ? `<span>${esc(item.label)}</span>` : `<a href="${attr(item.href)}">${esc(item.label)}</a> <span aria-hidden="true">/</span> `).join('')}</nav>`;
const normaliseHeadings = body => body.replace(/^# (.+)$/gm, '## $1');
const articleCta = () => `<aside class="article-cta"><a href="${consultationUrl}" target="_blank" rel="noopener">個別相談を申し込む</a></aside>`;
const author = () => `<aside class="article-author"><h2>著者</h2><div class="author-inner"><img src="/assets/images/profile.jpg" alt="廣瀬 祥久"><div><p class="author-name">廣瀬 祥久<br>和奏人事パートナーズ 代表</p><p>中小企業の採用・人事・組織づくりを支援。<br>求人だけを見るのではなく、理念・評価・育成・定着・創業家まで含め、「人が集まり、育ち、定着する会社」を経営者と一緒につくっています。</p><p class="author-copy">一人一人の音（個性・使命）を、一つの和に。</p></div></div></aside>`;
const categoryIndex = posts => Object.keys(categoryMap).filter(category => posts.some(post => post.categories.includes(category)));
const pageMeta = post => ({title: post.seo_title || `${post.title}｜和奏人事パートナーズ`, description: post.seo_description || post.excerpt || post.intro, canonical: `${siteUrl}/column/${post.slug}/`});
const write = async (file, content) => { await fs.mkdir(path.dirname(file), {recursive:true}); await fs.writeFile(file, content, 'utf8'); };
const generatedMarker = path.join(outputDir, '.generated-pages.json');
const previous = async () => { try { return JSON.parse(await fs.readFile(generatedMarker, 'utf8')); } catch { return {paths: []}; } };
const removePrevious = async marker => {
  for (const item of marker.paths || []) {
    const target = path.join(outputDir, item);
    await fs.rm(target, {recursive:true, force:true});
  }
};
const build = async () => {
  const posts = await readPosts();
  const marker = await previous();
  await removePrevious(marker);
  const generated = [];
  const categories = categoryIndex(posts);
  const filter = categories.length ? `<div class="column-filter" data-column-filter aria-label="カテゴリで絞り込む"><button type="button" data-category="all" aria-pressed="true">すべて</button>${categories.map(category => `<button type="button" data-category="${category}" aria-pressed="false">${esc(categoryMap[category])}</button>`).join('')}</div>` : '';
  const featured = posts.filter(post => post.pickup);
  const pickup = featured.length ? `<section class="pickup" aria-labelledby="pickup-title"><span class="column-eyebrow">PICK UP</span><div class="pickup-grid">${featured[0].eyecatch ? `<a class="pickup-image" href="/column/${attr(featured[0].slug)}/"><img src="${attr(featured[0].eyecatch)}" alt=""></a>` : ''}<div class="pickup-content"><div class="column-card-meta"><time datetime="${attr(featured[0].published_at)}">${formatDate(featured[0].published_at)}</time>${tags(featured[0])}</div><h2 id="pickup-title"><a href="/column/${attr(featured[0].slug)}/">${esc(featured[0].title)}</a></h2><p>${esc(featured[0].excerpt)}</p><a class="pickup-link" href="/column/${attr(featured[0].slug)}/">記事を読む →</a></div></div></section>` : '';
  const indexMain = `${nav('column')}<main><section class="column-hero"><div class="column-hero-inner"><span class="column-eyebrow">COLUMN</span><h1>コラム</h1><p>採用・人事・組織づくりを、同族会社の経営という視点から考えます。</p></div></section><div class="column-main"><div class="column-container">${pickup}<section aria-labelledby="latest-title"><span class="column-eyebrow">LATEST</span><h2 class="column-section-title" id="latest-title">最新の記事</h2>${posts.length ? `${filter}<p class="column-no-results" data-column-no-results hidden>該当する記事はありません。</p><div class="column-grid">${posts.map(card).join('')}</div><script src="/column/filter.js" defer></script>` : '<div class="column-empty">現在、コラムを準備中です。</div>'}</section></div></div></main>${footer()}`;
  await write(path.join(outputDir, 'index.html'), layout({title:'コラム｜和奏人事パートナーズ', description:'和奏人事パートナーズのコラム。採用・人事・組織づくりを、同族会社の経営という視点から考えます。', canonical:`${siteUrl}/column/`, body:indexMain}));
  generated.push('index.html');
  for (const category of categories) {
    const filtered = posts.filter(post => post.categories.includes(category));
    const categoryMain = `${nav('column')}<main>${breadcrumb([{label:'TOP',href:'/'},{label:'コラム',href:'/column/'},{label:categoryMap[category]}])}<section class="column-hero"><div class="column-hero-inner"><span class="column-eyebrow">COLUMN CATEGORY</span><h1>${esc(categoryMap[category])}</h1><p>「${esc(categoryMap[category])}」に関する記事一覧です。</p></div></section><div class="column-main"><div class="column-container"><div class="column-grid">${filtered.map(card).join('')}</div></div></div></main>${footer()}`;
    const categoryPath = path.join('category', category, 'index.html');
    await write(path.join(outputDir, categoryPath), layout({title:`${categoryMap[category]}｜コラム｜和奏人事パートナーズ`, description:`${categoryMap[category]}に関するコラム一覧です。`, canonical:`${siteUrl}/column/category/${category}/`, body:categoryMain}));
    generated.push(categoryPath);
  }
  for (const post of posts) {
    const meta = pageMeta(post);
    const related = posts.filter(item => post.related_articles.includes(item.slug));
    const service = services[post.related_service];
    const structuredData = JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,datePublished:post.published_at,dateModified:post.updated_at || post.published_at,description:meta.description,mainEntityOfPage:meta.canonical,image:`${siteUrl}${post.ogp_image}`,author:{'@type':'Person',name:'廣瀬 祥久'},publisher:{'@type':'Organization',name:'和奏人事パートナーズ'}});
    const articleMain = `${nav('column')}<main>${breadcrumb([{label:'TOP',href:'/'},{label:'コラム',href:'/column/'},{label:post.title}])}<article class="article-shell"><header class="article-header"><div class="article-meta"><time datetime="${attr(post.published_at)}">${formatDate(post.published_at)}</time>${tags(post)}${post.wasou_view ? '<span class="column-tag">WASOU VIEW</span>' : ''}</div><h1>${esc(post.title)}</h1><p class="article-intro">${esc(post.intro)}</p>${post.eyecatch ? `<figure class="article-eyecatch"><img src="${attr(post.eyecatch)}" alt=""></figure>` : ''}</header><div class="article-body">${md.render(normaliseHeadings(post.body))}</div>${post.show_article_cta ? articleCta() : ''}${author()}${related.length ? `<section class="article-related" aria-labelledby="related-title"><h2 id="related-title">関連記事</h2><div class="related-grid">${related.map(item => `<a href="/column/${attr(item.slug)}/">${esc(item.title)}</a>`).join('')}</div></section>` : ''}${service ? `<section class="article-service" aria-labelledby="service-title"><h2 id="service-title">関連サービス</h2><div class="article-service-box"><p>${esc(service.label)}</p><a href="${attr(service.href)}">サービスの詳細を見る →</a></div></section>` : ''}</article></main>${footer()}`;
    const articlePath = path.join(post.slug, 'index.html');
    await write(path.join(outputDir, articlePath), layout({...meta, body:articleMain, structuredData}));
    generated.push(articlePath);
  }
  await write(generatedMarker, JSON.stringify({paths: generated}, null, 2));
  if (sitemapPath) {
    let sitemap = await fs.readFile(sitemapPath, 'utf8');
    const urls = [
      {loc:`${siteUrl}/column/`, priority:'0.7'},
      ...categories.map(category => ({loc:`${siteUrl}/column/category/${category}/`, priority:'0.5'})),
      ...posts.map(post => ({loc:`${siteUrl}/column/${post.slug}/`, lastmod:post.updated_at || post.published_at, priority:'0.6'}))
    ];
    const block = `  <!-- COLUMN_URLS:START -->\n${urls.map(url => `  <url>\n    <loc>${url.loc}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}\n    <changefreq>monthly</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`).join('\n')}\n  <!-- COLUMN_URLS:END -->`;
    const markerPattern = /  <!-- COLUMN_URLS:START -->[\s\S]*?  <!-- COLUMN_URLS:END -->/;
    sitemap = markerPattern.test(sitemap) ? sitemap.replace(markerPattern, block) : sitemap.replace('</urlset>', `${block}\n</urlset>`);
    await fs.writeFile(sitemapPath, sitemap, 'utf8');
  }
  console.log(`Generated ${posts.length} published article(s), ${categories.length} category page(s).`);
};
await build();
