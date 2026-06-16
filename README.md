# Readhubs — كورسات عربية عملية

دليل النشر وإضافة الكورسات في 3 خطوات.

---

## الخطوة 1: نشر الموقع على GitHub Pages

1. أنشئ ريبو باسم `readhubs.github.io` (إذا لم يكن موجوداً)
2. ارفع هذه الملفات في مجلد `ar/` داخل جذر الريبو
3. في إعدادات الريبو → **Pages** → اختر `main` branch → اضغط **Save**
4. الموقع سيكون متاحاً على: `https://readhubs.github.io/ar/`

> **ملاحظة:** انتظر 2-5 دقائق بعد رفع الملفات حتى يتفعل GitHub Pages.

---

## الخطوة 2: إضافة أول كورس

### أ. أنشئ ملف txt للكورس

اصنع ملف نصي باسم `[slug-الكورس].txt` (أحرف إنجليزية صغيرة وشرطة فقط).  
مثال: `negotiate-your-salary.txt`

يجب أن يتبع الملف هذا التنسيق:

```
[SECTION:UDEMY_DATA]
TITLE: عنوان الكورس الكامل
DESCRIPTION: وصف تفصيلي من 2-3 جمل
KEYWORDS: كلمة1, كلمة2, كلمة3
AUDIENCE: الجمهور المستهدف
REQUIREMENTS: المتطلبات المسبقة
OUTCOMES:
- النتيجة الأولى بعد إتمام الكورس
- النتيجة الثانية
- ...حتى 8 نتائج
[/SECTION]

[SECTION:OUTLINE]
[PART:1]
TITLE: عنوان الجزء الأول
LECTURES: 1,2,3,4,5,6
[/PART]
[PART:2]
TITLE: عنوان الجزء الثاني
LECTURES: 7,8,9,10,11,12
[/PART]
[PART:3]
TITLE: عنوان الجزء الثالث
LECTURES: 13,14,15,16,17,18
[/PART]
[PART:4]
TITLE: عنوان الجزء الرابع
LECTURES: 19,20,21,22,23,24
[/PART]
[/SECTION]

[SECTION:LECTURES]
[LECTURE:1]
TITLE: عنوان المحاضرة الأولى
DURATION: 10:30
PART: 1
[SCRIPT:START]
نص المحاضرة التفصيلي هنا — كلما كان أطول وأغنى، كانت المقالات أفضل.
يجب أن يحتوي على معلومات قيّمة وشاملة حول موضوع المحاضرة.
[SCRIPT:END]
[SLIDES:START]
[SLIDE:1]
TITLE: عنوان الشريحة الأولى
- نقطة أساسية أولى
- نقطة أساسية ثانية
- نقطة أساسية ثالثة
[/SLIDE]
[SLIDE:2]
TITLE: عنوان الشريحة الثانية
- نقطة أخرى
- نقطة أخرى
[/SLIDE]
[/SLIDES]
[EXERCISE:START]
TITLE: عنوان التمرين العملي
- الخطوة الأولى في التمرين
- الخطوة الثانية
- الخطوة الثالثة
[EXERCISE:END]
[/LECTURE]

[LECTURE:2]
... كرر لكل المحاضرات الـ24 ...
[/LECTURE]
[/SECTION]
```

### ب. ارفع الملف على GitHub

1. افتح الريبو على GitHub
2. انتقل لمجلد `ar/courses-raw/`
3. اضغط **Add file → Upload files**
4. ارفع الملف واضغط **Commit changes**

### ج. أضف بيانات الكورس في `courses-data.js`

افتح ملف `ar/courses-data.js` وأضف كائناً جديداً داخل مصفوفة `courses`:

```javascript
{
  slug: "negotiate-your-salary",        // يطابق اسم ملف txt بدون الامتداد
  niche: "career",                       // money | communication | mental-health | productivity | career
  udemy_url: "https://www.udemy.com/course/...",
  coupon_code: "READHUBS50",             // أو "" إذا لا يوجد كوبون
  coupon_expires: "2025-12-31T23:59:00", // أو "" إذا لا يوجد
  status: "published",                   // draft = مخفي من البحث | published = مفهرس
  thumbnail: "",
  added_date: "2025-01-01"
},
```

### د. تحقق من الكورس

- صفحة الكورس: `https://readhubs.github.io/ar/course.html?course=negotiate-your-salary`
- أول مقال: `https://readhubs.github.io/ar/article.html?course=negotiate-your-salary&article=1`

---

## ملاحظات هامة

- **الكورسات المسودة** (`status: "draft"`) تظهر بشكل طبيعي لمن يعرف الرابط، لكنها لا تُفهرس من محركات البحث ولا تظهر في الرئيسية.
- **لتفعيل فهرسة كورس:** غيّر `status` من `"draft"` إلى `"published"` في `courses-data.js`.
- **كل كورس يولّد 200 مقال تلقائياً** من ملف txt الواحد — لا حاجة لأي خطوات إضافية.
- **لتحديث بيانات الكوبون:** عدّل `coupon_code` و`coupon_expires` في `courses-data.js` فقط.
- **صفحة المساعدة:** `https://readhubs.github.io/ar/admin/upload.html` — تحتوي على مولّد كود تلقائي لبيانات الكورس.
- **خريطة الموقع:** افتح `https://readhubs.github.io/ar/sitemap-builder.html` وانسخ النص الناتج إلى ملف `sitemap.xml`.

---

## هيكل الملفات

```
ar/
├── index.html              ← الصفحة الرئيسية
├── article.html            ← قالب المقالات (200 مقال × عدد الكورسات)
├── course.html             ← قالب صفحة الكورس
├── deals.html              ← صفحة العروض والكوبونات
├── about.html              ← صفحة من نحن
├── style.css               ← نظام التصميم الموحد
├── courses-data.js         ← سجل الكورسات (تُعدّله يدوياً)
├── article-engine.js       ← محرك توليد المقالات
├── floating-button.js      ← زر CTA العائم + تسجيل SW
├── sw.js                   ← Service Worker (PWA)
├── manifest.json           ← بيانات PWA
├── sitemap-builder.html    ← مولّد خريطة الموقع
├── courses-raw/            ← ارفع ملفات txt الكورسات هنا
│   └── [slug].txt
├── niches/
│   ├── money.html
│   ├── communication.html
│   ├── mental-health.html
│   ├── productivity.html
│   └── career.html
└── admin/
    └── upload.html         ← دليل إضافة الكورسات
```
