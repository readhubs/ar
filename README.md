# Readhubs — 
كورسات عربية عملية


موقع PWA عربي ثابت (بدون سيرفر) يولّد **200 مقال لكل كورس** من ملف `.txt` واحد.  
يُنشر على GitHub Pages ويُحدَّث تلقائياً عبر GitHub Actions.

---

## نشر الموقع لأول مرة

1. أنشئ ريبو جديد على GitHub (مثل: `ar` تحت حساب `readhubs`)
2. ارفع **كل محتوى هذا الـ ZIP** (لا المجلد نفسه) في جذر الريبو — بحيث يكون `index.html` مباشرةً في الجذر
3. في إعدادات الريبو → **Settings → Pages** → اختر branch: `main` → folder: `/ (root)` → اضغط **Save**
4. الموقع سيكون على: `https://readhubs.github.io/ar/`

> انتظر 2–5 دقائق بعد أول رفع حتى يتفعّل GitHub Pages.

---

## إضافة كورس جديد (خطوة واحدة فقط)

1. في الريبو، انتقل لمجلد **`courses-raw/`**
2. اضغط **Add file → Upload files**
3. ارفع ملف `.txt` الخاص بالكورس → اضغط **Commit changes**
4. **GitHub Actions ستعمل تلقائياً** خلال ~30 ثانية وتُحدِّث الفهرس
5. يظهر الكورس في الموقع فوراً ✓

```
رفع .txt على GitHub
      ↓
GitHub Actions تشتغل تلقائياً (~30 ث)
      ↓
تُحدِّث courses-raw/index.json و courses-data.js
      ↓
الكورس يظهر في الموقع ✓
```

### أول مرة فقط — تشغيل يدوي

بعد رفع الـ ZIP لأول مرة، شغّل الـ workflow يدوياً مرة واحدة:  
**Actions → Update Course Index → Run workflow**

---

## تنسيق ملف الكورس `.txt`

الموقع يدعم **تنسيقين**:

### التنسيق الجديد (DeepSeek / ChatGPT)

```
# كورس: عنوان الكورس

## أولاً — بيانات صفحة Udemy
**العنوان المحسّن للـ SEO:**
عنوان الكورس
**الوصف الكامل (150-200 كلمة):**
وصف الكورس...
**5 كلمات مفتاحية:**
كلمة1، كلمة2، كلمة3
**الجمهور المستهدف:**
- الجمهور الأول
**متطلبات الكورس:**
- لا توجد متطلبات
**ماذا سيتعلم الطالب (8 نقاط):**
1. النتيجة الأولى

## ثانياً — Outline كامل
**القسم الأول: عنوان القسم**
- المحاضرة 1: عنوان المحاضرة

## ثالثاً — سكريبت كامل لكل محاضرة
== المحاضرة 1: عنوان المحاضرة ==
**المدة المتوقعة: 10 دقيقة**
[السكريبت]
نص المحاضرة هنا...

## رابعاً — السلايدات بصيغة PPTX
== سلايدات المحاضرة 1: عنوان المحاضرة ==
سلايدة 1:
العنوان: عنوان الشريحة
النقاط:
- نقطة أولى
- نقطة ثانية
```

### التنسيق القديم (مدعوم أيضاً)

```
[SECTION:UDEMY_DATA]
العنوان_المحسّن: عنوان الكورس
الوصف: وصف الكورس...
الكلمات_المفتاحية: كلمة1، كلمة2
الجمهور: الجمهور المستهدف
المتطلبات: لا توجد
مخرجات_التعلم:
- النتيجة الأولى
[/SECTION:UDEMY_DATA]

[SECTION:OUTLINE]
[PART:1][PART_TITLE:عنوان القسم]
[L:1] عنوان المحاضرة
[/PART:1]
[/SECTION:OUTLINE]

[SECTION:LECTURES]
[LECTURE:1][TITLE:عنوان المحاضرة][DURATION:10][PART:1]
[SCRIPT:START]
نص المحاضرة هنا...
[SCRIPT:END]
[SLIDES:START]
[SLIDE:1]
[SLIDE_TITLE:عنوان الشريحة]
[BULLET]نقطة أولى[/BULLET]
[/SLIDE:1]
[SLIDES:END]
[/SECTION:LECTURES]
```

---

## إضافة رابط Udemy وكوبون الخصم

افتح `courses-raw/index.json` وعدّل بيانات الكورس:

```json
{
  "slug": "اسم-الكورس",
  "title": "عنوان الكورس",
  "niche": "communication",
  "udemy_url": "https://www.udemy.com/course/...",
  "coupon_code": "READHUBS50",
  "coupon_expires": "2026-12-31",
  "status": "published",
  "thumbnail": "",
  "added_date": "2026-06-17"
}
```

**قيم niche المتاحة:** `money` | `communication` | `mental-health` | `productivity` | `career`  
**status:** `published` = يظهر في الموقع | `draft` = مخفي

---

## التحقق لمحركات البحث (Google & Bing)

> **أين تضع ملفات التحقق؟**  
> في **جذر الريبو** بجانب `index.html` مباشرةً.

### Google Search Console

1. افتح [search.google.com/search-console](https://search.google.com/search-console)
2. اضغط **Add property** → أدخل `https://readhubs.github.io/ar/`
3. اختر طريقة التحقق: **HTML file**
4. نزّل الملف (مثل: `google1a2b3c4d5e.html`)
5. ارفعه في **جذر الريبو** (بجانب `index.html`)
6. ارجع لـ Search Console واضغط **Verify**

### Bing Webmaster Tools

1. افتح [bing.com/webmasters](https://www.bing.com/webmasters)
2. أضف الموقع: `https://readhubs.github.io/ar/`
3. اختر **XML file** → نزّل `BingSiteAuth.xml`
4. ارفعه في **جذر الريبو** (بجانب `index.html`)
5. اضغط **Verify**

---

## خريطة الموقع (Sitemap)

1. افتح `https://readhubs.github.io/ar/sitemap-builder.html`
2. انسخ النص الناتج
3. أنشئ ملف `sitemap.xml` في جذر الريبو والصق النص فيه
4. أرسل رابط الـ sitemap لـ Google Search Console و Bing

---

## هيكل الملفات

```
/ (جذر الريبو = جذر الموقع)
├── index.html                   ← الصفحة الرئيسية
├── article.html                 ← قالب المقالات (200 × عدد الكورسات)
├── course.html                  ← قالب صفحة الكورس
├── deals.html                   ← صفحة العروض والكوبونات
├── about.html                   ← صفحة من نحن
├── style.css                    ← نظام التصميم
├── article-engine.js            ← محرك توليد المقالات (يدعم التنسيقين)
├── build-courses.js             ← يُشغَّل تلقائياً بواسطة GitHub Actions
├── courses-data.js              ← مُولَّد تلقائياً — لا تعدّله يدوياً
├── floating-button.js           ← زر التصفح العائم
├── sw.js                        ← Service Worker (PWA)
├── manifest.json                ← بيانات PWA
├── sitemap-builder.html         ← مولّد خريطة الموقع
├── google[xxxxx].html           ← ← ضع ملف تحقق Google هنا
├── BingSiteAuth.xml             ← ← ضع ملف تحقق Bing هنا
├── courses-raw/
│   ├── index.json               ← مُولَّد تلقائياً — لا تعدّله إلا لإضافة روابط Udemy
│   └── [slug].txt               ← ارفع ملفات الكورسات هنا
├── niches/
│   ├── money.html
│   ├── communication.html
│   ├── mental-health.html
│   ├── productivity.html
│   └── career.html
├── admin/
│   └── upload.html
└── .github/
    └── workflows/
        └── update-courses.yml   ← GitHub Actions (تشتغل تلقائياً)
```

---

## روابط مفيدة بعد النشر

| الصفحة | الرابط |
|--------|--------|
| الرئيسية | `https://readhubs.github.io/ar/` |
| كورس محدد | `https://readhubs.github.io/ar/course.html?course=[slug]` |
| مقال محدد | `https://readhubs.github.io/ar/article.html?course=[slug]&article=1` |
| خريطة الموقع | `https://readhubs.github.io/ar/sitemap-builder.html` |
