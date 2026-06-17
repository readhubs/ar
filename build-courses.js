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

/* ─── 1. احتفظ بالبيانات اليدوية الموجودة (رابط Udemy، الكوبون، إلخ) ─── */
let saved = {};
try {
  const existing = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  (existing.courses || []).forEach(c => { saved[c.slug] = c; });
} catch { /* أول تشغيل */ }

/* ─── 2. دوال مساعدة لاستخراج الحقول من ملف txt ─── */
function extractTitle(content) {
  // Try "# كورس: ..." header at the very top
  const h = content.match(/^#\s*كورس[:：]\s*(.+)/m);
  if (h) return h[1].trim();
  // Try bold SEO title field
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
  const slug    = file.replace(/\.txt$/, "");
  const content = fs.readFileSync(path.join(RAW_DIR, file), "utf8");
  const title   = extractTitle(content) || slug;
  const old     = saved[slug] || {};

  return {
    slug,
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
