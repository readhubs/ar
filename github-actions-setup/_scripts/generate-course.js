#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const REPO_ROOT   = path.resolve(__dirname, '..');
const COURSES_DIR = path.join(REPO_ROOT, '_courses');
const GSC = '  <meta name="google-site-verification" content="pgigX05_bS7NIfxgAqbgPF1yhXFxfBwGxSSkj62HsC4" />';

// ─── MAIN ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let files = [];
  if (args.length > 0) {
    files = args.filter(function(f) { return fs.existsSync(f); });
  } else {
    if (!fs.existsSync(COURSES_DIR)) { console.log('No _courses/ directory.'); return; }
    files = fs.readdirSync(COURSES_DIR)
      .filter(function(f) { return f.endsWith('.txt'); })
      .map(function(f) { return path.join(COURSES_DIR, f); });
  }
  if (!files.length) { console.log('No .txt files to process.'); return; }
  for (let i = 0; i < files.length; i++) {
    console.log('\n=== Processing: ' + path.basename(files[i]) + ' ===');
    processCourse(files[i]);
  }
}

function processCourse(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const course = parseCourse(text);
  const slug = generateSlug(course.udemyData.title);
  const niche = detectNiche(course.udemyData.keywords);

  console.log('  Title: ' + course.udemyData.title);
  console.log('  Slug:  ' + slug);
  console.log('  Niche: ' + niche.id + '  Lectures: ' + course.lectures.length);

  const courseDir  = path.join(REPO_ROOT, 'courses', slug);
  const articlesDir = path.join(courseDir, 'articles');
  fs.mkdirSync(articlesDir, { recursive: true });

  console.log('  Generating 200 articles...');
  const articles = generateArticles(course, slug);
  articles.forEach(function(a) {
    fs.writeFileSync(path.join(articlesDir, a.filename), a.content, 'utf-8');
  });

  console.log('  Generating landing page...');
  fs.writeFileSync(path.join(courseDir, 'index.html'), buildLandingPage(course, slug, articles), 'utf-8');

  console.log('  Updating courses-data.js...');
  updateCoursesData(slug, course.udemyData.title, niche.id);

  console.log('  Updating sitemap.xml...');
  appendSitemap(slug, articles);

  console.log('  Done! Course live at: https://readhubs.github.io/ar/courses/' + slug + '/');
}

// ─── PARSER ─────────────────────────────────────────────────────────────────

function splitMajorSections(text) {
  const anchors = [
    { key: 'udemy',   re: /^## أولاً/m },
    { key: 'outline', re: /^## ثانياً/m },
    { key: 'scripts', re: /^## ثالثاً/m },
    { key: 'slides',  re: /^## رابعاً/m },
    { key: 'quizzes', re: /^## خامساً/m },
  ];
  const positions = [];
  anchors.forEach(function(a) {
    const m = text.match(a.re);
    if (m && m.index !== undefined) positions.push({ key: a.key, start: m.index });
  });
  positions.sort(function(a, b) { return a.start - b.start; });
  const result = {};
  positions.forEach(function(p, i) {
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length;
    result[p.key] = text.slice(p.start, end).trim();
  });
  return result;
}

function fieldAfter(text, labelRe) {
  const m = text.match(new RegExp(labelRe.source + '\\s*\\n+([\\s\\S]*?)(?=\\n\\*\\*|\\n---|$)'));
  return m ? m[1].trim() : '';
}

function parseUdemy(sec) {
  const titleM = sec.match(/\*\*العنوان[^*]*\*\*\s*\n+([^\n]+)/);
  const title = titleM ? titleM[1].trim() : '';
  const descM = sec.match(/\*\*الوصف[^*]*\*\*[\s\S]*?\n+([\s\S]*?)(?=\n\*\*|\n---|$)/);
  const description = descM ? descM[1].trim() : '';
  const kwM = sec.match(/\*\*[^*]*كلمات مفتاحية[^*]*\*\*[\s\S]*?\n+([^\n]+)/);
  const keywords = kwM ? kwM[1].trim() : '';
  const audM = sec.match(/\*\*الجمهور[^*]*\*\*[\s\S]*?\n+([\s\S]*?)(?=\n\*\*|\n---|$)/);
  const audience = audM ? audM[1].trim() : '';
  const reqM = sec.match(/\*\*متطلبات[^*]*\*\*[\s\S]*?\n+([\s\S]*?)(?=\n\*\*|\n---|$)/);
  const requirements = reqM ? reqM[1].trim() : '';
  const outM = sec.match(/\*\*ماذا سيتعلم[^*]*\*\*[\s\S]*?\n+([\s\S]*?)(?=\n\*\*|\n---|$)/);
  const learningOutcomes = outM
    ? outM[1].split('\n').filter(function(l) { return /^\d+[.)]\s/.test(l.trim()); })
        .map(function(l) { return l.replace(/^\d+[.)]\s*/, '').trim(); }).filter(Boolean)
    : [];
  return { title, description, keywords, audience, requirements, learningOutcomes };
}

function parseOutline(sec) {
  const parts = [];
  const partRe = /\*\*القسم[^:*]+:\s*([^\n*]+)\*\*/g;
  const headers = [];
  let m;
  while ((m = partRe.exec(sec)) !== null) headers.push(m);
  let globalLecture = 1;
  headers.forEach(function(h, i) {
    const partTitle = h[1].trim();
    const blockStart = h.index + h[0].length;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : sec.length;
    const block = sec.slice(blockStart, blockEnd);
    const count = (block.match(/^[ \t]*-[ \t]+المحاضرة/gm) || []).length;
    const lectureNums = [];
    for (let j = 0; j < count; j++) lectureNums.push(globalLecture++);
    parts.push({ number: parts.length + 1, title: partTitle, lectures: lectureNums });
  });
  return parts;
}

function parseScripts(sec) {
  const results = [];
  const HEADER = /==\s*المحاضرة\s+(\d+)\s*:\s*([^=\n]+?)\s*==/g;
  const headers = [];
  let m;
  while ((m = HEADER.exec(sec)) !== null) headers.push(m);
  headers.forEach(function(h, i) {
    const num = parseInt(h[1]);
    const title = h[2].trim();
    const start = h.index + h[0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : sec.length;
    const body = sec.slice(start, end);
    const durM = body.match(/\*\*المدة المتوقعة:\s*(\d+)\s*دقيقة\*\*/);
    const duration = durM ? parseInt(durM[1]) : 15;
    const scriptM = body.match(/\[السكريبت\]\s*\n+([\s\S]*)/);
    const script = scriptM ? scriptM[1].trim() : body.replace(/\*\*[^*]*\*\*/g, '').trim();
    results.push({ number: num, title, duration, partNumber: 0, script, slides: [] });
  });
  return results;
}

function parseSlides(sec) {
  const map = new Map();
  const HEADER = /==\s*سلايدات المحاضرة\s+(\d+)\s*:[^=\n]*==/g;
  const headers = [];
  let m;
  while ((m = HEADER.exec(sec)) !== null) headers.push(m);
  headers.forEach(function(h, i) {
    const lectNum = parseInt(h[1]);
    const start = h.index + h[0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : sec.length;
    const block = sec.slice(start, end);
    const chunks = block.split(/(?=\nسلايدة\s+\d+\s*:)/);
    const slides = [];
    chunks.forEach(function(chunk) {
      const tM = chunk.match(/(?:العنوان|عنوان الشريحة)\s*:\s*([^\n]+)/);
      const bM = chunk.match(/(?:النقاط|نقاط|المحتوى)\s*:\s*\n([\s\S]*)/);
      if (!tM) return;
      const bullets = bM
        ? bM[1].split('\n').filter(function(l) { return l.trim().startsWith('-'); })
            .map(function(l) { return l.replace(/^[\s-]+/, '').trim(); }).filter(Boolean)
        : [];
      slides.push({ number: slides.length + 1, title: tM[1].trim(), bullets });
    });
    if (slides.length) map.set(lectNum, slides);
  });
  return map;
}

function parseCourse(text) {
  const sec = splitMajorSections(text);
  if (!sec.scripts && !sec.udemy) throw new Error('Unsupported file format. Need: أولاً ثانياً ثالثاً رابعاً خامساً');
  const udemyData = parseUdemy(sec.udemy || '');
  const parts = parseOutline(sec.outline || '');
  const slidesMap = parseSlides(sec.slides || '');
  const scriptData = parseScripts(sec.scripts || '');
  const lecturePartMap = new Map();
  parts.forEach(function(p) { p.lectures.forEach(function(n) { lecturePartMap.set(n, p.number); }); });
  const lectures = scriptData.map(function(ld) {
    return Object.assign({}, ld, {
      partNumber: lecturePartMap.get(ld.number) || 1,
      slides: slidesMap.get(ld.number) || [],
    });
  });
  lectures.sort(function(a, b) { return a.number - b.number; });
  if (!lectures.length) throw new Error('No lectures found.');
  if (lectures.length !== 24) throw new Error('Expected 24 lectures, found ' + lectures.length);
  if (!udemyData.title) throw new Error('Course title not found.');
  return { udemyData, parts, lectures };
}

// ─── SLUG ────────────────────────────────────────────────────────────────────

const ARABIC_TO_LATIN = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ئ': 'y', 'ؤ': 'w',
};
const WORD_MAP = {
  'كيف': 'how', 'على': 'on', 'من': 'from', 'في': 'fy', 'الى': 'to',
  'المال': 'money', 'الاستثمار': 'investment', 'التواصل': 'communication',
  'الوقت': 'time', 'إدارة': 'management', 'النفس': 'self', 'الثقة': 'confidence',
  'الإنتاجية': 'productivity', 'إنتاجية': 'productivity', 'العادات': 'habits',
  'المهني': 'professional', 'المسيرة': 'career', 'الوظيفة': 'job', 'العمل': 'work',
  'التسويق': 'marketing', 'البيع': 'sales', 'القيادة': 'leadership', 'الفريق': 'team',
  'الأعمال': 'business', 'التخطيط': 'planning', 'الأهداف': 'goals', 'النجاح': 'success',
  'التطوير': 'development', 'الذاتي': 'self', 'الشخصية': 'personal', 'المهارات': 'skills',
  'الصحة': 'health', 'مهارات': 'skills', 'دليل': 'guide', 'كامل': 'complete',
  'عملي': 'amly', 'إقناع': 'persuasion', 'التأثير': 'altathyr', 'تأثير': 'tathyr',
  'الإقناع': 'aliqnaa', 'والتأثير': 'waltathyr', 'الآخرين': 'alakhryn',
  'ريادة': 'entrepreneurship', 'الأعمال': 'business', 'الكورس': 'course',
};

function generateSlug(title) {
  const cleaned = title
    .replace(/[\u064B-\u065F\u0640]/g, '')
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s]/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const parts = words.map(function(w) {
    if (WORD_MAP[w]) return WORD_MAP[w];
    let res = '', i = 0;
    while (i < w.length) {
      const two = w.slice(i, i + 2);
      if (ARABIC_TO_LATIN[two]) { res += ARABIC_TO_LATIN[two]; i += 2; }
      else {
        const ch = w[i];
        const code = ch.charCodeAt(0);
        if (code >= 0x064B && code <= 0x065F) { i++; continue; }
        res += (ARABIC_TO_LATIN[ch] !== undefined ? ARABIC_TO_LATIN[ch] : (ch.match(/[a-z0-9]/i) ? ch.toLowerCase() : ''));
        i++;
      }
    }
    return res;
  });
  return (parts.filter(Boolean).join('-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()) || 'course';
}

// ─── NICHE ───────────────────────────────────────────────────────────────────

const NICHE_RULES = [
  { id: 'money',         label: 'MONEY/FINANCE',                 kw: ['مال','استثمار','راتب','دخل','ميزانية','ثروة','ربح','بورصة','عقار'] },
  { id: 'communication', label: 'COMMUNICATION/RELATIONSHIPS',    kw: ['تواصل','علاقات','إقناع','تفاوض','حوار','خطابة','اجتماعي','صداقة','فريق'] },
  { id: 'mental-health', label: 'MENTAL HEALTH/BALANCE',         kw: ['قلق','نفسي','توازن','ثقة','مشاعر','سعادة','ضغط','توتر','تأمل','ذات'] },
  { id: 'productivity',  label: 'PRODUCTIVITY/TIME',             kw: ['وقت','إنتاجية','تركيز','عادات','هدف','خطة','تنظيم','فعالية','تحسين'] },
  { id: 'career',        label: 'CAREER/PROFESSIONAL',           kw: ['مهني','وظيف','عمل','مسيرة','فريلانس','احتراف','شركة','مشروع','ريادة','بيع','قيادة'] },
];

function detectNiche(keywords) {
  const lower = keywords.toLowerCase();
  let best = NICHE_RULES[3]; // default: productivity
  let bestCount = 0;
  NICHE_RULES.forEach(function(rule) {
    let count = 0;
    rule.kw.forEach(function(k) { if (lower.includes(k)) count++; });
    if (count > bestCount) { bestCount = count; best = rule; }
  });
  return best;
}

// ─── HTML HELPERS ────────────────────────────────────────────────────────────

function excerpt(text, maxLen) {
  maxLen = maxLen || 150;
  const clean = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen - 3) + '...' : clean;
}

function scriptParagraphs(script, minPara) {
  minPara = minPara || 3;
  const sentences = script.split(/[.!?؟،,\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 20; });
  const paras = [];
  let current = '';
  sentences.forEach(function(s) {
    current += (current ? ' ' : '') + s + '.';
    if (current.length > 150) { paras.push(current); current = ''; }
  });
  if (current) paras.push(current);
  while (paras.length < minPara) paras.push('يُعدّ هذا الموضوع من المحاور المهمة التي تستحق الدراسة والتعمق لما له من أثر مباشر على حياتنا اليومية.');
  return paras;
}

function buildBody(paragraphs) {
  return paragraphs.map(function(p) { return '<p>' + p + '</p>'; }).join('\n      ');
}

function articleHtml(num, title, body, slug, courseTitle, relatedHtml) {
  const n = String(num).padStart(3, '0');
  const desc = excerpt(body);
  return '<!DOCTYPE html>\n' +
    '<html lang="ar" dir="rtl">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <!-- INDEXING_TOGGLE_START -->\n' +
    '  <meta name="robots" content="noindex, nofollow">\n' +
    '  <!-- INDEXING_TOGGLE_END -->\n' +
    GSC + '\n' +
    '  <title>' + title + ' | Readhubs</title>\n' +
    '  <meta name="description" content="' + desc.replace(/"/g, '&quot;') + '">\n' +
    '  <link rel="canonical" href="https://readhubs.github.io/ar/courses/' + slug + '/articles/article-' + n + '.html">\n' +
    '  <link rel="stylesheet" href="../../../style.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '  <article class="article-page">\n' +
    '    <header class="article-header">\n' +
    '      <a href="../../../index.html" class="logo">Readhubs</a>\n' +
    '      <nav class="breadcrumb">\n' +
    '        <a href="../../../index.html">الرئيسية</a> ›\n' +
    '        <a href="../index.html">' + courseTitle + '</a> ›\n' +
    '        <span>' + title + '</span>\n' +
    '      </nav>\n' +
    '    </header>\n' +
    '    <h1>' + title + '</h1>\n' +
    '    <div class="article-body">\n      ' + body + '\n    </div>\n' +
    '    <div class="article-cta">\n' +
    '      <h3>هل تريد التعمق أكثر؟</h3>\n' +
    '      <p>هذه المقالة جزء من كورس شامل يغطي ' + courseTitle + ' بالتفصيل</p>\n' +
    '      <a href="../index.html" class="cta-button">اطلع على الكورس الكامل</a>\n' +
    '    </div>\n' +
    (relatedHtml ? '    <div class="related-articles"><h3>مقالات ذات صلة</h3><ul>' + relatedHtml + '</ul></div>\n' : '') +
    '  </article>\n' +
    '</body>\n</html>';
}

function relatedLinks(articleIndex, groupIndexes) {
  return groupIndexes.filter(function(i) { return i !== articleIndex; }).slice(0, 3)
    .map(function(i) {
      const n = String(i + 1).padStart(3, '0');
      return '<li><a href="article-' + n + '.html">مقالة ذات صلة ' + (i + 1) + '</a></li>';
    }).join('');
}

// ─── ARTICLE TEMPLATES ───────────────────────────────────────────────────────

function tpl1(lec, slug, ct, num, related) {
  const p = scriptParagraphs(lec.script, 4);
  const bullets = lec.slides.reduce(function(acc, s) { return acc.concat(s.bullets); }, []).slice(0, 3);
  const body = buildBody([
    'تعريف ' + lec.title + ': ' + p[0],
    p[1] || 'يتناول هذا المحور الأساسيات التي يحتاجها كل مهتم بهذا المجال.',
    'أبرز ما يميز هذا المفهوم: ' + (bullets.join('، ') || 'الوضوح والعمق والتطبيق المباشر') + '.',
    p[2] || 'إن فهم هذا المفهوم يفتح آفاقاً واسعة للتطوير والنمو الشخصي.',
    'خلاصة القول، ' + lec.title + ' ليس مجرد مفهوم نظري، بل هو منهج عملي يمكن تطبيقه في الحياة اليومية بشكل فعّال ومستدام.',
  ]);
  return articleHtml(num, 'ما هو ' + lec.title + '؟', body, slug, ct, related);
}

function tpl2(lec, slug, ct, num, related) {
  const steps = lec.slides.reduce(function(acc, s) { return acc.concat(s.bullets); }, []).slice(0, 5);
  const p = scriptParagraphs(lec.script, 3);
  const stepsHtml = steps.length ? '<ol>' + steps.map(function(s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' : '';
  const body = buildBody(['تطبيق ' + lec.title + ' يتطلب اتباع خطوات واضحة ومنهجية. ' + p[0], 'الخطوات العملية المقترحة:']) +
    '\n      ' + stepsHtml + '\n      ' +
    buildBody([p[1] || 'من المهم أن تبدأ بخطوات صغيرة وتتدرج في التطبيق.',
      'تذكر دائماً أن ' + lec.title + ' يحتاج إلى ممارسة مستمرة حتى يصبح عادة راسخة في حياتك.']);
  return articleHtml(num, 'كيف تتقن ' + lec.title + '؟ خطوات عملية', body, slug, ct, related);
}

function tpl3(lec, slug, ct, num, related) {
  const p = scriptParagraphs(lec.script, 4);
  const body = buildBody([
    'في عالم سريع التغير، يصبح ' + lec.title + ' ضرورة لا رفاهية. ' + p[0],
    'الفائدة الأولى: ' + (p[1] || 'تحسين القدرة على اتخاذ القرارات الصحيحة في الوقت المناسب.'),
    'الفائدة الثانية: ' + (p[2] || 'بناء علاقات أكثر عمقاً وجودة مع الآخرين.'),
    'من منظور يومي، ' + lec.title + ' يساعدك على التعامل مع التحديات بثقة وهدوء أكبر.',
    'لهذه الأسباب مجتمعةً، لا يمكن الاستهانة بأهمية ' + lec.title + ' في مسيرتنا نحو حياة أفضل.',
  ]);
  return articleHtml(num, 'لماذا ' + lec.title + ' مهم لحياتك اليومية؟', body, slug, ct, related);
}

function tpl4(lec, slug, ct, num, related) {
  const bullets = lec.slides.reduce(function(acc, s) { return acc.concat(s.bullets); }, []).slice(0, 5);
  const mistakesList = bullets.length
    ? '<ul>' + bullets.map(function(b, i) { return '<li><strong>الخطأ ' + (i+1) + ':</strong> إهمال "' + b + '" أو عدم أخذه بالجدية الكافية.</li>'; }).join('') + '</ul>'
    : '<ul><li>عدم الاستمرارية في التطبيق.</li><li>الاستعجال في النتائج دون بناء أساس متين.</li><li>إهمال التغذية الراجعة والتعلم من الأخطاء.</li></ul>';
  const p = scriptParagraphs(lec.script, 2);
  const body = buildBody(['في رحلة تعلم ' + lec.title + '، يقع كثيرون في أخطاء شائعة تُعيق تقدمهم. ' + p[0], 'أبرز هذه الأخطاء:']) +
    '\n      ' + mistakesList + '\n      ' +
    buildBody([p[1] || 'الوعي بهذه الأخطاء هو نصف الطريق نحو تجنبها.',
      'تجنّب هذه الأخطاء يمنحك ميزة تنافسية واضحة في مسيرتك في ' + lec.title + '.']);
  return articleHtml(num, 'أكثر الأخطاء شيوعاً في ' + lec.title, body, slug, ct, related);
}

function tpl5(lec, slug, ct, num, related) {
  const allBullets = lec.slides.reduce(function(acc, s) { return acc.concat(s.bullets); }, []).slice(0, 7);
  const tipsList = allBullets.length
    ? '<ol>' + allBullets.map(function(b, i) { return '<li><strong>النصيحة ' + (i+1) + ':</strong> ' + b + '</li>'; }).join('') + '</ol>'
    : '<ol><li>ابدأ بخطوات صغيرة وقابلة للقياس.</li><li>التزم بالممارسة اليومية.</li><li>ابحث عن مجتمع داعم يشاركك نفس الأهداف.</li></ol>';
  const p = scriptParagraphs(lec.script, 2);
  const body = buildBody(['إليك أهم النصائح العملية التي ستساعدك على إتقان ' + lec.title + ':']) +
    '\n      ' + tipsList + '\n      ' +
    buildBody([p[0] || 'تطبيق هذه النصائح بانتظام سيُحدث تحولاً ملموساً في مهاراتك.',
      'تذكر أن النجاح في ' + lec.title + ' لا يأتي بين ليلة وضحاها، بل هو ثمرة جهد متراكم وإصرار مستمر.']);
  return articleHtml(num, (allBullets.length || 5) + ' نصائح عملية في ' + lec.title, body, slug, ct, related);
}

function tpl6(lec, slug, ct, num, related) {
  const p = scriptParagraphs(lec.script, 5);
  const body = buildBody([
    'لتقريب مفهوم ' + lec.title + ' من الواقع، إليك بعض الأمثلة والسيناريوهات العملية:',
    'المثال الأول: ' + p[0],
    'المثال الثاني: ' + (p[1] || 'تخيّل موقفاً حياتياً يومياً يتطلب تطبيق هذا المفهوم بشكل مباشر.'),
    'المثال الثالث: ' + (p[2] || 'في بيئة العمل، يظهر هذا المفهوم بوضوح في التعاملات اليومية بين الزملاء.'),
    p[3] || 'هذه الأمثلة تُثبت أن التطبيق الفعلي هو أفضل طريقة للتعلم والنمو.',
  ]);
  return articleHtml(num, 'أمثلة واقعية على ' + lec.title, body, slug, ct, related);
}

function tpl7(lec, slug, ct, num, related, nextLec) {
  const p = scriptParagraphs(lec.script, 3);
  const conceptA = (lec.slides[0] && lec.slides[0].title) || lec.title;
  const conceptB = (nextLec && nextLec.title) || (lec.slides[1] && lec.slides[1].title) || 'المفهوم التقليدي';
  const rows = [
    ['الجانب', conceptA, conceptB],
    ['التعريف', p[0].slice(0, 60) + '...', 'النهج الكلاسيكي المعروف'],
    ['التطبيق', 'يُطبَّق في السياقات الحديثة', 'يُطبَّق في السياقات التقليدية'],
    ['النتائج', 'نتائج أسرع وأكثر استدامة', 'نتائج تقليدية تحتاج وقتاً أطول'],
  ];
  const table = '<table><tbody>' + rows.map(function(r) {
    return '<tr>' + r.map(function(c, i) { return i === 0 ? '<th>' + c + '</th>' : '<td>' + c + '</td>'; }).join('') + '</tr>';
  }).join('') + '</tbody></table>';
  const body = buildBody(['كثيراً ما يُخلط بين ' + conceptA + ' و' + conceptB + '. دعنا نوضح الفروق الجوهرية:']) +
    '\n      ' + table + '\n      ' +
    buildBody([p[1] || 'فهم هذا الفرق يساعدك على اختيار النهج الأنسب لكل موقف.',
      'في نهاية المطاف، كلا المفهومين لهما قيمة، والمهارة الحقيقية تكمن في معرفة متى تستخدم كلاً منهما.']);
  return articleHtml(num, 'الفرق بين ' + conceptA + ' و' + conceptB, body, slug, ct, related);
}

function tpl8(lec, slug, ct, num, related) {
  const p = scriptParagraphs(lec.script, 4);
  const bullets = lec.slides.reduce(function(acc, s) { return acc.concat(s.bullets); }, []).slice(0, 6);
  const bulletsList = bullets.length
    ? '<ul>' + bullets.map(function(b) { return '<li>' + b + '</li>'; }).join('') + '</ul>'
    : '';
  const body = buildBody(['هذا الدليل الشامل يجمع كل ما تحتاج معرفته عن ' + lec.title + ' في مكان واحد.',
    p[0], 'النقاط الأساسية:']) +
    '\n      ' + bulletsList + '\n      ' +
    buildBody(['كيف تطبقه؟ ' + (p[1] || 'ابدأ بتطبيق ما تعلمته في مواقف يومية بسيطة.'),
      'لماذا يهمك؟ ' + (p[2] || 'لأنه يُحسّن جودة حياتك ويفتح أمامك فرصاً جديدة.'),
      'احتفظ بهذا الدليل مرجعاً دائماً في رحلتك نحو إتقان ' + lec.title + '.']);
  return articleHtml(num, 'دليلك الكامل لـ' + lec.title, body, slug, ct, related);
}

function generateCourseArticle(num, title, body, slug, courseTitle) {
  const groupIdx = 192 + (num - 193);
  return articleHtml(num, title, body, slug, courseTitle, '');
}

function generateArticles(course, slug) {
  const articles = [];
  const lectures = course.lectures;
  const ct = course.udemyData.title;

  for (let li = 0; li < lectures.length; li++) {
    const lec = lectures[li];
    const nextLec = lectures[li + 1];
    const base = li * 8;
    const groupIdx = Array.from({ length: 8 }, function(_, i) { return base + i; });
    const makers = [
      function() { return tpl1(lec, slug, ct, base + 1, relatedLinks(base + 0, groupIdx)); },
      function() { return tpl2(lec, slug, ct, base + 2, relatedLinks(base + 1, groupIdx)); },
      function() { return tpl3(lec, slug, ct, base + 3, relatedLinks(base + 2, groupIdx)); },
      function() { return tpl4(lec, slug, ct, base + 4, relatedLinks(base + 3, groupIdx)); },
      function() { return tpl5(lec, slug, ct, base + 5, relatedLinks(base + 4, groupIdx)); },
      function() { return tpl6(lec, slug, ct, base + 6, relatedLinks(base + 5, groupIdx)); },
      function() { return tpl7(lec, slug, ct, base + 7, relatedLinks(base + 6, groupIdx), nextLec); },
      function() { return tpl8(lec, slug, ct, base + 8, relatedLinks(base + 7, groupIdx)); },
    ];
    for (let ti = 0; ti < 8; ti++) {
      const num = base + ti + 1;
      articles.push({ filename: 'article-' + String(num).padStart(3, '0') + '.html', content: makers[ti](), title: 'مقالة ' + num });
    }
  }

  // 8 course-level articles (193-200)
  const kw = course.udemyData.keywords || ct;
  const p0 = scriptParagraphs(lectures[0].script, 3);
  const p23 = scriptParagraphs(lectures[23].script, 3);
  const courseArticles = [
    { title: 'دليلك الشامل لـ' + ct, body: buildBody(['هذا الكورس الشامل يغطي ' + ct + ' من الصفر حتى الاحتراف.', p0[0], 'مع التطبيق العملي خطوة بخطوة.']) },
    { title: 'لماذا تتعلم ' + ct + '؟', body: buildBody(['تعلّم ' + ct + ' يفتح أمامك آفاقاً واسعة.', p0[1] || 'الفوائد الحقيقية تظهر في حياتك اليومية.', p0[2] || 'استثمر وقتك في ما يُحدث فرقاً حقيقياً.']) },
    { title: ct + ' للمبتدئين: من أين تبدأ؟', body: buildBody(['إذا كنت مبتدئاً، فهذا الكورس هو نقطة انطلاقتك.', 'الخطوة الأولى: ' + p0[0], 'لا تتردد — كل خبير كان مبتدئاً يوماً ما.']) },
    { title: 'أهم مفاهيم ' + ct, body: buildBody(['إليك أهم المفاهيم التي ستتعلمها في هذا الكورس:', lectures.slice(0, 4).map(function(l) { return l.title; }).join(' | '), 'كل مفهوم مدعوم بتطبيقات حياتية حقيقية.']) },
    { title: 'كيف يغير ' + ct + ' حياتك؟', body: buildBody([p0[0], 'التغيير الحقيقي يبدأ بقرار التعلم والتطبيق.', p23[0]]) },
    { title: ct + ': الأسئلة الشائعة', body: buildBody(['ما هو ' + ct + '؟ ' + p0[0], 'من يحتاجه؟ كل من يريد تطوير نفسه مهنياً وشخصياً.', 'كم يستغرق التعلم؟ مع الممارسة اليومية، ستلاحظ تحسناً خلال أسابيع.']) },
    { title: 'نتائج تعلم ' + ct, body: buildBody(['بعد إتمام هذا الكورس ستكون قادراً على:', course.udemyData.learningOutcomes.slice(0, 4).join(' | ') || p0[0], p23[1] || 'النتائج حقيقية وقابلة للقياس في حياتك.']) },
    { title: ct + ': خلاصة وتوصيات', body: buildBody(['ختاماً، ' + ct + ' مهارة تستحق الاستثمار.', p23[0], 'ابدأ اليوم ولا تنتظر — الوقت المناسب هو الآن.']) },
  ];
  courseArticles.forEach(function(ca, i) {
    const num = 193 + i;
    articles.push({ filename: 'article-' + String(num).padStart(3, '0') + '.html', content: generateCourseArticle(num, ca.title, ca.body, slug, ct), title: ca.title });
  });

  return articles;
}

// ─── LANDING PAGE ────────────────────────────────────────────────────────────

function buildLandingPage(course, slug, articles) {
  const { udemyData, parts, lectures } = course;
  const title = udemyData.title;
  const desc160 = udemyData.description.slice(0, 160).replace(/"/g, '&quot;');

  const outcomesHtml = udemyData.learningOutcomes.slice(0, 8).map(function(o) { return '<li>' + o + '</li>'; }).join('\n        ');
  const outlineHtml = parts.map(function(p) {
    const partLecs = lectures.filter(function(l) { return l.partNumber === p.number; });
    const lecsHtml = partLecs.map(function(l) { return '<li>المحاضرة ' + l.number + ': ' + l.title + ' (' + l.duration + ' دقيقة)</li>'; }).join('\n            ');
    return '<div class="part-section"><h3>القسم ' + p.number + ': ' + p.title + '</h3><ul>' + lecsHtml + '</ul></div>';
  }).join('\n        ');

  const articleLinksHtml = articles.slice(0, 24).map(function(a) {
    return '<li><a href="articles/' + a.filename + '">' + a.title + '</a></li>';
  }).join('\n        ');

  return '<!DOCTYPE html>\n' +
    '<html lang="ar" dir="rtl">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <meta name="robots" content="index, follow">\n' +
    GSC + '\n' +
    '  <title>' + title + ' | Readhubs</title>\n' +
    '  <meta name="description" content="' + desc160 + '">\n' +
    '  <link rel="canonical" href="https://readhubs.github.io/ar/courses/' + slug + '/index.html">\n' +
    '  <link rel="stylesheet" href="../../style.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '  <header class="site-header">\n' +
    '    <a href="../../index.html" class="logo">Readhubs</a>\n' +
    '    <nav class="site-nav">\n' +
    '      <a href="../../niches/money.html">المال</a>\n' +
    '      <a href="../../niches/communication.html">التواصل</a>\n' +
    '      <a href="../../niches/mental-health.html">الصحة النفسية</a>\n' +
    '      <a href="../../niches/productivity.html">الإنتاجية</a>\n' +
    '      <a href="../../niches/career.html">المسيرة المهنية</a>\n' +
    '    </nav>\n' +
    '  </header>\n' +
    '  <main class="course-landing">\n' +
    '    <div class="course-hero">\n' +
    '      <img src="thumbnail.jpg" alt="' + title + '" class="course-thumbnail" onerror="this.style.display='none'">\n' +
    '      <h1>' + title + '</h1>\n' +
    '      <p class="course-description">' + udemyData.description + '</p>\n' +
    '      <a href="#" class="udemy-cta" id="udemy-link" target="_blank" rel="noopener">🎓 اشترِ الكورس الآن على Udemy</a>\n' +
    '      <p class="coupon-note" id="coupon-note"></p>\n' +
    '    </div>\n' +
    '    <section class="outcomes-section"><h2>ماذا ستتعلم؟</h2><ul class="outcomes-list">' + outcomesHtml + '</ul></section>\n' +
    '    <section class="outline-section"><h2>محتوى الكورس</h2>' + outlineHtml + '</section>\n' +
    '    <section class="articles-section"><h2>مقالات تعليمية</h2>\n' +
    '      <ul class="articles-list">' + articleLinksHtml + '</ul>\n' +
    '    </section>\n' +
    '  </main>\n' +
    '  <script src="../../courses-data.js"></script>\n' +
    '  <script src="../../config.js"></script>\n' +
    '  <script>\n' +
    '    (function() {\n' +
    '      var d = (window.coursesData || []).find(function(c) { return c.slug === "' + slug + '"; });\n' +
    '      if (d) {\n' +
    '        var link = document.getElementById("udemy-link");\n' +
    '        var note = document.getElementById("coupon-note");\n' +
    '        if (d.udemyUrl) link.href = d.udemyUrl + (d.coupon ? "?couponCode=" + d.coupon : "");\n' +
    '        if (d.coupon) note.textContent = "كوبون الخصم: " + d.coupon;\n' +
    '      }\n' +
    '    })();\n' +
    '  </script>\n' +
    '  <footer class="site-footer"><span>&copy; ' + new Date().getFullYear() + ' Readhubs</span></footer>\n' +
    '</body>\n</html>';
}

// ─── COURSES-DATA.JS UPDATE ──────────────────────────────────────────────────

function updateCoursesData(slug, title, nicheId) {
  const filePath = path.join(REPO_ROOT, 'courses-data.js');
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf-8');
  }
  if (existing.includes('"' + slug + '"')) {
    console.log('    (course already in courses-data.js)');
    return;
  }
  const entry = '  { slug: "' + slug + '", title: "' + title.replace(/"/g, '\\"') + '", niche: "' + nicheId + '", udemyUrl: "", coupon: "" }';
  if (!existing) {
    fs.writeFileSync(filePath, 'const coursesData = [\n' + entry + '\n];\n', 'utf-8');
    return;
  }
  // Append before closing bracket
  const updated = existing.replace(/];\s*$/, ',\n' + entry + '\n];\n');
  if (updated === existing) {
    fs.appendFileSync(filePath, '\n// ' + slug + '\n' + entry);
  } else {
    fs.writeFileSync(filePath, updated, 'utf-8');
  }
}

// ─── SITEMAP UPDATE ──────────────────────────────────────────────────────────

function appendSitemap(slug, articles) {
  const sitemapPath = path.join(REPO_ROOT, 'sitemap.xml');
  const today = new Date().toISOString().slice(0, 10);
  const base = 'https://readhubs.github.io/ar';
  const newUrls = [
    '  <url><loc>' + base + '/courses/' + slug + '/index.html</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>',
  ].concat(articles.slice(0, 50).map(function(a) {
    return '  <url><loc>' + base + '/courses/' + slug + '/articles/' + a.filename + '</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>';
  }));

  if (!fs.existsSync(sitemapPath)) {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      newUrls.join('\n') + '\n</urlset>';
    fs.writeFileSync(sitemapPath, xml, 'utf-8');
    return;
  }
  const existing = fs.readFileSync(sitemapPath, 'utf-8');
  if (existing.includes('/courses/' + slug + '/')) {
    console.log('    (sitemap already has this course)');
    return;
  }
  const updated = existing.replace('</urlset>', newUrls.join('\n') + '\n</urlset>');
  fs.writeFileSync(sitemapPath, updated, 'utf-8');
}

// ─── RUN ────────────────────────────────────────────────────────────────────

try {
  main();
} catch(err) {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
}
