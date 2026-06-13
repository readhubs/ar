=== تعليمات رفع الملفات على GitHub Pages ===

هذا الملف ZIP يحتوي على مجلدين رئيسيين:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الجزء الأول: repo-base-files/ (ملفات إعداد الموقع - مرة واحدة فقط)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ارفع هذه الملفات مباشرة إلى الجذر (root) في مستودع readhubs.github.io/ar:

  repo-base-files/
  ├── index.html          → رفع إلى: /index.html
  ├── style.css           → رفع إلى: /style.css
  ├── courses-data.js     → رفع إلى: /courses-data.js
  ├── config.js           → رفع إلى: /config.js
  ├── update-visibility.js → رفع إلى: /update-visibility.js
  ├── sitemap.xml         → رفع إلى: /sitemap.xml
  ├── robots.txt          → رفع إلى: /robots.txt
  ├── about/              → رفع إلى: /about/
  ├── deals/              → رفع إلى: /deals/
  └── niches/             → رفع إلى: /niches/

⚠️ هذه الخطوة مرة واحدة فقط عند إعداد الموقع لأول مرة.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الجزء الثاني: ملفات الكورس (لكل كورس جديد)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  courses/skills-aliqnaa-waltathyr-fy-alakhryn-guide-amly-lltathyr-on-alnas/         → رفع إلى: /courses/skills-aliqnaa-waltathyr-fy-alakhryn-guide-amly-lltathyr-on-alnas/
  course-entry-snippet.js  → أضف محتواه يدوياً إلى courses-data.js في GitHub

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الجزء الثالث: ملفات PPTX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  pptx/*.pptx  → احتفظ بها على جهازك أو Google Drive
                (لا ترفعها على GitHub - حجمها كبير)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تفعيل المقالات لاحقاً (SEO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. عدّل /config.js: أضف سطر مثل:  "skills-aliqnaa-waltathyr-fy-alakhryn-guide-amly-lltathyr-on-alnas": 50
2. شغّل:  node update-visibility.js
3. ادفع التغييرات إلى GitHub

الدعم: راجع ملف course-entry-snippet.js لبيانات الكورس.
