=== Readhubs GitHub Pages - ملفات الإعداد الأساسية ===

رفع هذه الملفات على مستودع GitHub Pages (readhubs.github.io/ar):

الهيكل:
  index.html          → الصفحة الرئيسية
  style.css           → نظام التصميم الكامل
  courses-data.js     → بيانات الكورسات (تحديث يدوي بعد كل كورس)
  config.js           → التحكم في ظهور المقالات
  update-visibility.js → سكريبت تفعيل المقالات (node update-visibility.js)
  sitemap.xml         → خريطة الموقع
  robots.txt          → توجيهات محركات البحث
  about/index.html    → صفحة "من نحن"
  deals/index.html    → صفحة العروض والكوبونات
  niches/             → 5 صفحات الفئات (money, communication, mental-health, productivity, career)

الخطوات التالية:
1. ارفع هذه الملفات على GitHub في مستودع readhubs.github.io/ar
2. شغّل الأداة مع ملف كورس .txt للحصول على محتوى الكورس
3. ارفع مجلد courses/<slug>/ الناتج على نفس المستودع
4. عدّل courses-data.js بإضافة بيانات الكورس الجديد

لاحقاً لتفعيل SEO:
  عدّل config.js وشغّل: node update-visibility.js
  ثم: git add . && git commit -m "تفعيل مقالات" && git push
