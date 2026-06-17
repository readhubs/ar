#!/usr/bin/env node
/**
 * build-courses.js — شغّل هذا الملف بعد إضافة أي ملف .txt في مجلد courses-raw/
 *
 * الاستخدام:
 *   node build-courses.js
 *
 * النتيجة:
 *   • courses-raw/index.json  — فهرس الكورسات (يقرأه الموقع تلقائياً)
 *   • courses-data.js         — نسخة JS من الفهرس (يستخدمها الموقع كاحتياط)
 */

"use strict";
const fs   = require("fs");
const path = require("path");

const RAW_DIR = path.join(__dirname, "courses-raw");
const INDEX   = path.join(RAW_DIR,   "index.json");
const DATA_JS = path.join(__dirname, "courses-data.js");

/* ─── 0. تحويل اسم الملف إلى slug آمن للـ URL ─── */
function toSlug(filename) {
  // Remove .txt extension
  let s = filename.replace(/\.txt$/, "");

  // If already ASCII-safe (no spaces, no Arabic), keep as-is
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;

  // Transliterate common Arabic letters to Latin equivalents
  const arMap = {
    'ا':'a','أ':'a','إ':'a','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh',
    'د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z',
    'ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w',
    'ي':'y','ى':'a','ة':'a','ء':'','ئ':'y','ؤ':'w','لا':'la',
  };
  let result = "";
  for (const ch of s) {
    result += arMap[ch] !== undefined ? arMap[ch] : ch;
  }
  // Replace spaces and underscores with hyphens, strip non-alphanumeric
  result = result
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9\u0621-\u064A-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return result || s.replace(/\s+/g, "-").substring(0, 60);
}

/* ─── 1. احتفظ بالبيانات اليدوية الموجودة (رابط Udemy، الكوبون، إلخ) ─── */
// Index by both slug AND original filename (for migration)
let saved = {};
try {
  const existing = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  (existing.courses || []).forEach(c => {
    saved[c.slug] = c;
    if (c._srcFile) saved[c._srcFile] = c;
  });
} catch { /* أول تشغيل */ }

/* ─── 2. دوال مساعدة لاستخراج الحقول من ملف txt ─── */
function extractTitle(content) {
  // Old format: العنوان_المحسّن: title  (inside [SECTION:UDEMY_DATA])
  const old = content.match(/العنوان_المحسّن:\s*(.+)/);
  if (old) return old[1].trim();
  // New format: # كورس: title  (top-level header)
  const h = content.match(/^#\s*كورس[:：]\s*(.+)/m);
  if (h) return h[1].trim();
  // Bold SEO title field
  const seo = content.match(/\*\*العنوان المحسّن[^*]*\*\*\s*\n([^\n*]+)/);
  if (seo) return seo[1].trim();
  // Generic bold title field
  const t = content.match(/\*\*(?:اسم الكورس|عنوان الكورس|العنوان)[^*]*\*\*\s*\n?([^\n*]+)/);
  if (t) return t[1].trim();
  return "";
}

function guessNiche(title) {
  const t = title;
  if (/مال|استثمار|مالي|ثروة|دخل|ربح/.test(t))                                            return "money";
  if (/تواصل|قناع|تأثير|تاثير|حوار|خطاب|تفاوض|علاق/.test(t))                             return "communication";
  if (/نفس|قلق|اكتئاب|توتر|ذكاء عاطفي|صحة نفس/.test(t))                                  return "mental-health";
  if (/نتاجية|تنظيم الوقت|إدارة الوقت|وقت|هدف|عادات|تركيز/.test(t))                      return "productivity";
  if (/مسار|وظيف|مهن|قياد|إدار|ادار|احتراف|leadership|management/.test(t))               return "career";
  return "general";
}

/* ─── 3. امسح جميع ملفات .txt ─── */
if (!fs.existsSync(RAW_DIR)) {
  console.error("✗ المجلد courses-raw/ غير موجود بجانب هذا السكريبت.");
  process.exit(1);
}

const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".txt"));

if (files.length === 0) {
  console.warn("⚠ لا توجد ملفات .txt في courses-raw/");
}

const courses = files.map(file => {
  const slug    = toSlug(file);
  const srcFile = file.replace(/\.txt$/, "");  // original filename without extension
  const content = fs.readFileSync(path.join(RAW_DIR, file), "utf8");
  const title   = extractTitle(content) || srcFile;

  // Lookup saved data by slug first, then by original filename
  const old = saved[slug] || saved[srcFile] || {};

  return {
    slug,
    _srcFile: srcFile,          // original filename (used to load the .txt at runtime)
    title,
    niche:          (old.niche && old.niche !== "general") ? old.niche : guessNiche(title),
    udemy_url:      old.udemy_url      || "",
    coupon_code:    old.coupon_code    || "",
    coupon_expires: old.coupon_expires || "",
    status:         old.status         || "published",
    thumbnail:      old.thumbnail      || "",
    added_date:     old.added_date     || new Date().toISOString().split("T")[0]
  };
});

/* ─── 4. اكتب courses-raw/index.json ─── */
fs.writeFileSync(INDEX, JSON.stringify({ courses }, null, 2), "utf8");
console.log(`\n✓ courses-raw/index.json — تم تحديثه بـ ${courses.length} كورس`);

/* ─── 5. اكتب courses-data.js ─── */
const jsContent = `/* courses-data.js
 * مُولَّد تلقائياً — لا تعدّل هذا الملف يدوياً.
 * لإضافة كورس جديد: ضع ملف .txt في courses-raw/ ثم شغّل:
 *   node build-courses.js
 */
const coursesData = ${JSON.stringify({ courses }, null, 2)};

if (typeof module !== "undefined") module.exports = coursesData;
`;
fs.writeFileSync(DATA_JS, jsContent, "utf8");
console.log("✓ courses-data.js\n");

courses.forEach(c =>
  console.log(`  • [${c.status}] ${c.slug}\n    ${c.title}`)
);
console.log("\nانتهى ✓  — ارفع الملفات المحدّثة وسيظهر الكورس تلقائياً.");
