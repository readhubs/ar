# Readhubs GitHub Pages — دليل الإعداد الكامل

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
المبدأ الأساسي: خطوة واحدة فقط لنشر كل كورس جديد
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ارفع ملف .txt إلى _courses/ في GitHub
                    ↓
  GitHub Actions يولّد تلقائياً:
    • 200 مقالة HTML  (courses/<slug>/articles/)
    • صفحة هبوط       (courses/<slug>/index.html)
    • يُحدّث courses-data.js
    • يُحدّث sitemap.xml
    • يعمل commit + push تلقائي [skip ci]
                    ↓
  GitHub Pages ينشر الكورس على:
  https://readhubs.github.io/ar/courses/<slug>/

لا تحتاج أداة Readhubs لنشر الكورس.
أداة Readhubs للـ PPTX فقط (لـ Udemy).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## هيكل هذا الـ ZIP

```
readhubs-github-setup.zip
├── github-actions-setup/          ← انسخه لجذر GitHub (مرة واحدة فقط)
│   ├── .github/
│   │   └── workflows/
│   │       └── process-course.yml  ← يُفعَّل تلقائياً عند رفع .txt
│   ├── _scripts/
│   │   ├── generate-course.js      ← يولّد 200 مقالة + صفحة هبوط
│   │   └── package.json            ← فارغ (لا npm install)
│   └── _courses/
│       └── README.md
│
├── repo-base-files/               ← ارفعه لجذر GitHub (مرة واحدة فقط)
│   ├── index.html                  ← الصفحة الرئيسية
│   ├── style.css
│   ├── courses-data.js             ← فارغ، يُحدَّث بـ Actions
│   ├── sitemap.xml                 ← أساسي، يُحدَّث بـ Actions
│   ├── robots.txt
│   ├── config.js
│   ├── update-visibility.js
│   ├── about/index.html
│   ├── deals/index.html
│   └── niches/ (5 صفحات)
│
└── README.md                      ← هذا الملف
```


## الإعداد الأول — مرة واحدة فقط

=== الخطوة 1: رفع ملفات الموقع ===

في مستودع readhubs/ar على GitHub:
- ارفع كل محتوى مجلد repo-base-files/ إلى جذر (root) المستودع

=== الخطوة 2: رفع ملفات الأتمتة ===

انسخ كل محتوى مجلد github-actions-setup/ إلى جذر المستودع:

  .github/workflows/process-course.yml
  _scripts/generate-course.js
  _scripts/package.json
  _courses/README.md

=== الخطوة 3: صلاحيات Actions (مهمة جداً) ===

Settings → Actions → General → Workflow permissions
→ اختر: Read and write permissions ✓
→ احفظ

=== الخطوة 4: تفعيل GitHub Pages ===

Settings → Pages → Source
→ Deploy from a branch
→ Branch: main → / (root)
→ احفظ


## لكل كورس جديد — خطوة واحدة فقط

  ارفع ملف الكورس .txt إلى _courses/ في GitHub

  هذا كل شيء. GitHub Actions يتولى الباقي تلقائياً.

  مثال:
  _courses/
  └── negotiate-your-salary.txt   ← ارفع هذا فقط

  النتيجة بعد ~2 دقيقة:
  courses/
  └── negotiate-your-salary/
      ├── index.html              ← صفحة هبوط الكورس
      └── articles/
          ├── article-001.html
          ├── article-002.html
          ...
          └── article-200.html    ← 200 مقالة SEO


## هل تحتاج deploy.yml منفصل؟

لا. GitHub Pages ينشر تلقائياً عند كل push لـ main.
process-course.yml وحده يكفي.

احتاج deploy.yml فقط للـ SPA/React — وهذا الموقع HTML ثابت.


## تفعيل مقالات Google تدريجياً (SEO)

المقالات تبدأ noindex. لتفعيلها:

  1. عدّل config.js:
     const ARTICLE_VISIBILITY = {
       "course-slug": 50,
     };

  2. في جهازك (بعد git clone):
     node update-visibility.js
     git add .
     git commit -m "activate 50 articles"
     git push

  3. راقب Google Search Console ثم زِد تدريجياً إلى 200


## تحديث رابط Udemy أو الكوبون

عدّل courses-data.js في GitHub:

  udemy_url: "https://www.udemy.com/course/...",
  coupon_code: "SAVE90",
  coupon_expires: "2025-12-31",
  status: "published"   ← غيّر من "draft" عند الجاهزية


## ما هي أداة Readhubs (PWA) إذاً؟

أداة Readhubs منفصلة تماماً عن نشر الموقع.
استخدمها فقط لتوليد:
  • 24 ملف PPTX (لرفعها على Udemy)
  • thumbnail_prompt.txt (لـ Nanobanana)
  • promo_prompt.txt (لـ DeepSeek)

لا علاقة لها بنشر المقالات أو صفحات الموقع.
