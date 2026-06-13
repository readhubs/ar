#!/usr/bin/env node
/**
 * الاستخدام:
 * 1. عدّل config.js: غيّر رقم المقالات المرئية لكل كورس
 * 2. شغّل: node update-visibility.js
 * 3. ادفع (commit + push) التغييرات لـ GitHub
 * 4. Google سيكتشف الصفحات الجديدة تدريجياً
 */

const fs = require("fs");
const path = require("path");

// Load config
let ARTICLE_VISIBILITY = {};
try {
  const configContent = fs.readFileSync(path.join(__dirname, "config.js"), "utf8");
  const match = configContent.match(/const ARTICLE_VISIBILITY\s*=\s*(\{[\s\S]*?\});/);
  if (match) {
    ARTICLE_VISIBILITY = eval("(" + match[1] + ")");
  }
} catch (e) {
  console.error("❌ تعذّر قراءة config.js:", e.message);
  process.exit(1);
}

const NOINDEX_BLOCK = `  <!-- INDEXING_TOGGLE_START -->
  <meta name="robots" content="noindex, nofollow">
  <!-- INDEXING_TOGGLE_END -->`;

const INDEX_TAG = '  <meta name="robots" content="index, follow">';

let totalActivated = 0;
let sitemapUrls = [
  "https://readhubs.github.io/ar/",
  "https://readhubs.github.io/ar/niches/money.html",
  "https://readhubs.github.io/ar/niches/communication.html",
  "https://readhubs.github.io/ar/niches/mental-health.html",
  "https://readhubs.github.io/ar/niches/productivity.html",
  "https://readhubs.github.io/ar/niches/career.html",
  "https://readhubs.github.io/ar/about/index.html",
  "https://readhubs.github.io/ar/deals/index.html",
];

for (const [slug, visibleCount] of Object.entries(ARTICLE_VISIBILITY)) {
  const articlesDir = path.join(__dirname, "courses", slug, "articles");
  if (!fs.existsSync(articlesDir)) {
    console.warn("⚠️ المجلد غير موجود:", articlesDir);
    continue;
  }

  // Add course landing page to sitemap
  sitemapUrls.push(`https://readhubs.github.io/ar/courses/${slug}/index.html`);

  const files = fs.readdirSync(articlesDir)
    .filter(f => f.startsWith("article-") && f.endsWith(".html"))
    .sort();

  let newlyActivated = 0;

  files.forEach((file, index) => {
    const filePath = path.join(articlesDir, file);
    let content = fs.readFileSync(filePath, "utf8");
    const articleNum = index + 1;

    if (articleNum <= visibleCount) {
      // Should be indexed
      if (content.includes("INDEXING_TOGGLE_START")) {
        content = content.replace(
          /[ \t]*<!-- INDEXING_TOGGLE_START -->[\s\S]*?<!-- INDEXING_TOGGLE_END -->/,
          INDEX_TAG
        );
        fs.writeFileSync(filePath, content, "utf8");
        newlyActivated++;
      }
      // Add to sitemap
      const articleUrl = `https://readhubs.github.io/ar/courses/${slug}/articles/${file}`;
      sitemapUrls.push(articleUrl);
    } else {
      // Should be noindexed
      if (!content.includes("INDEXING_TOGGLE_START")) {
        content = content.replace(INDEX_TAG, NOINDEX_BLOCK);
        fs.writeFileSync(filePath, content, "utf8");
      }
    }
  });

  console.log(`✅ تم تفعيل ${newlyActivated} مقالة جديدة لكورس [${slug}]`);
  totalActivated += newlyActivated;
}

// Regenerate sitemap.xml
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n")}
</urlset>`;

fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemapContent, "utf8");
console.log(`\n📄 تم تحديث sitemap.xml (${sitemapUrls.length} رابط)`);
console.log(`\n🎉 الإجمالي: ${totalActivated} مقالة جديدة تم تفعيلها`);
console.log("\n⏭️  الخطوة التالية: git add . && git commit -m 'تفعيل مقالات' && git push");
