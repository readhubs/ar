# Readhubs GitHub Pages — دليل الإعداد الكامل

## هيكل هذا الـ ZIP

```
readhubs-github-setup.zip
├── github-actions-setup/          ← انسخ هذا إلى جذر مستودع GitHub (مرة واحدة)
│   ├── .github/
│   │   └── workflows/
│   │       └── process-course.yml  ← الـ workflow (بدون PPTX - Node.js فقط)
│   ├── _scripts/
│   │   ├── generate-course.js      ← سكريبت توليد المحتوى (بدون dependencies)
│   │   └── package.json            ← فارغ (لا يحتاج npm install)
│   └── _courses/
│       └── README.md               ← تعليمات مجلد الكورسات
│
├── repo-base-files/               ← ارفع هذا إلى جذر المستودع (مرة واحدة)
│   ├── index.html                  ← الصفحة الرئيسية
│   ├── style.css                   ← ملف الستايل الموحّد
│   ├── courses-data.js             ← يُحدَّث تلقائياً بـ Actions
│   ├── sitemap.xml                 ← تُحدَّث تلقائياً بـ Actions
│   ├── robots.txt
│   ├── config.js                   ← التحكم في ظهور المقالات لـ Google
│   ├── update-visibility.js        ← يُشغَّل محلياً لتفعيل المقالات
│   ├── about/index.html
│   ├── deals/index.html
│   └── niches/
│       ├── money.html
│       ├── communication.html
│       ├── mental-health.html
│       ├── productivity.html
│       └── career.html
│
└── README.md                      ← هذا الملف
```

---

## الإعداد الأول (مرة واحدة فقط)

### الخطوة 1 — رفع ملفات الموقع الأساسية

في مستودع readhubs/ar على GitHub:
- ارفع كل محتوى مجلد repo-base-files/ مباشرة إلى جذر (root) المستودع

### الخطوة 2 — إعداد GitHub Actions

انسخ كل محتوى مجلد github-actions-setup/ إلى جذر المستودع:

  .github/workflows/process-course.yml
  _scripts/generate-course.js
  _scripts/package.json
  _courses/README.md

### الخطوة 3 — صلاحيات Actions (مهمة!)

Settings → Actions → General → Workflow permissions
→ اختر: Read and write permissions
→ احفظ

### الخطوة 4 — تفعيل GitHub Pages

Settings → Pages → Source
→ Deploy from a branch
→ Branch: main → / (root)
→ احفظ

---

## هل تحتاج deploy.yml منفصل؟

لا. لا تحتاجه إطلاقاً.

الموقع HTML ثابت (Static). GitHub Pages ينشر تلقائياً عند كل push إلى main.
process-course.yml يكفي وحده:
  1. يولّد HTML عند رفع .txt
  2. يعمل commit + push تلقائي [skip ci]
  3. GitHub Pages ينشر بعدها مباشرة

تحتاج deploy.yml فقط إذا كنت تبني React/Next.js SPA — وهذا الموقع HTML ثابت.

---

## إضافة كورس جديد

### المسار التلقائي (الأسهل):

  1. افتح أداة Readhubs → ارفع ملف الكورس .txt
  2. ارفع نفس الملف .txt إلى _courses/ في GitHub
     ↓
  GitHub Actions يشتغل تلقائياً (~2 دقيقة):
    • 200 مقالة HTML في courses/<slug>/articles/
    • صفحة هبوط courses/<slug>/index.html
    • تحديث courses-data.js
    • تحديث sitemap.xml
    • commit تلقائي [skip ci]
     ↓
  GitHub Pages ينشر: https://readhubs.github.io/ar/courses/<slug>/

### المسار اليدوي:

  1. افتح أداة Readhubs → ارفع .txt → حمّل ZIP
  2. من ZIP الناتج:
     - ارفع courses/<slug>/ إلى GitHub
     - أضف محتوى course-entry-snippet.js إلى courses-data.js يدوياً

---

## تفعيل مقالات Google (SEO) — تدريجياً

المقالات تبدأ بـ noindex. لتفعيلها:

  1. عدّل config.js:
     const ARTICLE_VISIBILITY = {
       "course-slug": 50,
     };

  2. في جهازك (بعد git clone):
     node update-visibility.js
     git add .
     git commit -m "activate 50 articles"
     git push

  3. راقب Google Search Console
  4. زِد تدريجياً: 50 → 100 → 150 → 200

---

## تحديث رابط Udemy أو الكوبون

عدّل courses-data.js في GitHub:

  {
    id: "course-slug",
    udemy_url: "https://www.udemy.com/course/...",
    coupon_code: "SAVE90",
    coupon_expires: "2025-12-31",
    status: "published"   ← غيّر من "draft" عند الجاهزية
  }

---

## ملفات لا ترفعها على GitHub

  pptx/*.pptx          — احفظها محلياً أو على Google Drive
  thumbnail_prompt.txt — للاستخدام مع Nanobanana فقط
  promo_prompt.txt     — للاستخدام مع DeepSeek فقط

---

## ملاحظات تقنية

  - الموقع: HTML ثابت بالكامل — لا Server، لا Database
  - الستايل: CSS موحّد (RTL، ألوان #0F1B2D/#C9A84C)
  - الأتمتة: GitHub Actions + Node.js built-in فقط (لا npm install)
  - SEO: noindex/index يُتحكَّم به عبر config.js
  - البيانات: courses-data.js يُقرأ client-side
  - GSC meta tag مضمّن في كل الصفحات
