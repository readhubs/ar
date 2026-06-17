/**
 * article-engine.js
 * Core parsing + article template logic for Readhubs Arabic.
 * Used by article.html and course.html via <script src="article-engine.js">
 *
 * TXT FILE FORMAT (DeepSeek-generated, courses-raw/[slug].txt):
 * ─────────────────────────────────────────────────────────────
 * # كورس: [title]
 *
 * ## أولاً — بيانات صفحة Udemy
 * **العنوان المحسّن للـ SEO:**
 * [title text]
 * **الوصف الكامل (150-200 كلمة):**
 * [description]
 * **5 كلمات مفتاحية:**
 * [keywords]
 * **الجمهور المستهدف:**
 * - item
 * **متطلبات الكورس:**
 * - item
 * **ماذا سيتعلم الطالب (8 نقاط):**
 * 1. outcome
 *
 * ## ثانياً — Outline كامل
 * **القسم الأول: [part title]**
 * - المحاضرة 1: [title]
 *
 * ## ثالثاً — سكريبت كامل لكل محاضرة
 * == المحاضرة 1: [title] ==
 * **المدة المتوقعة: 18 دقيقة**
 * [السكريبت]
 * [script text...]
 *
 * ## رابعاً — السلايدات بصيغة PPTX
 * == سلايدات المحاضرة 1: [title] ==
 * سلايدة 1:
 * العنوان: [slide title]
 * النقاط:
 * - bullet
 */

/* ─────────────────────────────────────────────────────────
   PARSER (OLD FORMAT)  —  [SECTION:UDEMY_DATA] / [LECTURE:N]
   ───────────────────────────────────────────────────────── */

function parseCourseFileOld(text) {
  try {
    function getSection(name) {
      const open  = `[SECTION:${name}]`;
      const close = `[/SECTION:${name}]`;
      const s = text.indexOf(open);
      const e = text.indexOf(close);
      if (s === -1) return "";
      return text.substring(s + open.length, e === -1 ? text.length : e);
    }

    /* ── UDEMY DATA ── */
    const udSec = getSection("UDEMY_DATA");

    function fieldVal(sec, key) {
      const m = sec.match(new RegExp(`${key}:\\s*(.+)`));
      return m ? m[1].trim() : "";
    }
    function fieldBullets(sec, key) {
      const idx = sec.indexOf(key + ":");
      if (idx === -1) return [];
      const after = sec.substring(idx + key.length + 1);
      return after.split("\n")
        .map(l => l.replace(/^[\s\-*•]+/, "").trim())
        .filter(l => l.length > 3 && !l.includes("[/SECTION") && !l.startsWith("["));
    }

    const udemyData = {
      title:        fieldVal(udSec, "العنوان_المحسّن"),
      description:  fieldVal(udSec, "الوصف"),
      keywords:     fieldVal(udSec, "الكلمات_المفتاحية"),
      audience:     fieldVal(udSec, "الجمهور"),
      requirements: fieldVal(udSec, "المتطلبات"),
      outcomes:     fieldBullets(udSec, "مخرجات_التعلم")
    };
    if (!udemyData.title) return null;

    /* ── OUTLINE ── */
    const outlineSec = getSection("OUTLINE");
    const parts = [];
    const partRe = /\[PART:(\d+)\]\[PART_TITLE:(.+?)\]([\s\S]*?)(?=\[PART:\d+\]|\[\/SECTION|$)/g;
    let pm;
    while ((pm = partRe.exec(outlineSec)) !== null) {
      const lectureNums = [];
      const lRe = /\[L:(\d+)\]/g;
      let lm;
      while ((lm = lRe.exec(pm[3])) !== null) lectureNums.push(parseInt(lm[1], 10));
      parts.push({ number: parseInt(pm[1], 10), title: pm[2].trim(), lectureNumbers: lectureNums });
    }

    /* ── LECTURES ── */
    const lecSec = getSection("LECTURES");
    const lecRe = /\[LECTURE:(\d+)\]\[TITLE:(.+?)\](?:\[DURATION:(\d+)\])?\[PART:(\d+)\]/g;
    const lecMatches = [...lecSec.matchAll(lecRe)];
    const lectures = [];

    for (let i = 0; i < lecMatches.length; i++) {
      const lm    = lecMatches[i];
      const num   = parseInt(lm[1], 10);
      const lTitle = lm[2].trim();
      const dur   = lm[3] ? lm[3] + " دقيقة" : "";
      const pNum  = parseInt(lm[4], 10);
      const bStart = lm.index;
      const bEnd   = i + 1 < lecMatches.length ? lecMatches[i + 1].index : lecSec.length;
      const block  = lecSec.substring(bStart, bEnd);

      /* Script */
      const ss = block.indexOf("[SCRIPT:START]");
      const se = block.indexOf("[SCRIPT:END]");
      const script = (ss !== -1 && se !== -1)
        ? block.substring(ss + "[SCRIPT:START]".length, se).trim()
        : "";

      /* Slides */
      const slides   = [];
      const slidesS  = block.indexOf("[SLIDES:START]");
      const slidesE  = block.indexOf("[SLIDES:END]");
      if (slidesS !== -1) {
        const sb  = block.substring(slidesS, slidesE === -1 ? block.length : slidesE);
        const sRe = /\[SLIDE:(\d+)\]([\s\S]*?)\[\/SLIDE:\d+\]/g;
        let sm;
        while ((sm = sRe.exec(sb)) !== null) {
          const tM   = sm[2].match(/\[SLIDE_TITLE:(.+?)\]/);
          const bArr = [];
          const bRe  = /\[BULLET\]([\s\S]*?)\[\/BULLET\]/g;
          let bm;
          while ((bm = bRe.exec(sm[2])) !== null) bArr.push(bm[1].trim());
          slides.push({ number: parseInt(sm[1], 10), title: tM ? tM[1].trim() : "", bullets: bArr });
        }
      }

      const part = parts.find(p => p.number === pNum);
      lectures.push({ number: num, title: lTitle, duration: dur,
        part: pNum, partTitle: part ? part.title : "",
        script, slides, exercise: null });
    }

    return { udemyData, outline: { parts }, lectures };
  } catch (err) {
    console.error("parseCourseFileOld error:", err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────
   PARSER (NEW FORMAT)  —  DeepSeek ## أولاً / ## ثانياً
   ───────────────────────────────────────────────────────── */

function parseCourseFile(rawText) {
  if (!rawText || rawText.trim().length === 0) return null;

  /* Route to old-format parser when the file uses [SECTION:...] markers */
  const normalised = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalised.includes("[SECTION:UDEMY_DATA]")) {
    return parseCourseFileOld(normalised);
  }

  try {
    const text = normalised;

    /* ── Locate the four main section headers ── */
    function secPos(arabicOrdinal) {
      const re = new RegExp(`^##\\s*${arabicOrdinal}`, "m");
      const m = text.match(re);
      return m ? m.index : -1;
    }
    const p1 = secPos("أولاً");
    const p2 = secPos("ثانياً");
    const p3 = secPos("ثالثاً");
    const p4 = secPos("رابعاً");
    const p5 = secPos("خامساً"); // optional quiz section — ignored

    function slice(from, to) {
      if (from === -1) return "";
      const end = to !== -1 ? to : text.length;
      return text.substring(from, end);
    }

    const sec1 = slice(p1, p2);   // بيانات Udemy
    const sec2 = slice(p2, p3);   // Outline
    const sec3 = slice(p3, p4);   // Scripts
    const sec4 = slice(p4, p5);   // Slides

    /* ─────────────────────────────
       SECTION 1 — UDEMY DATA
       ───────────────────────────── */

    /**
     * Extract the block of text that follows a bold label (**label...**:)
     * Returns everything until the next **bold** label, a section boundary,
     * or end-of-string.
     */
    function boldFieldBlock(section, labelRe) {
      const re = new RegExp(
        `\\*\\*${labelRe}[^*]*\\*\\*:?[ \\t]*\\n?([\\s\\S]*?)(?=\\n[ \\t]*\\*\\*|\\n##|\\n---|\$)`,
        "i"
      );
      const m = section.match(re);
      return m ? m[1].trim() : "";
    }

    function boldFieldLine(section, labelRe) {
      return boldFieldBlock(section, labelRe).split("\n")[0].trim();
    }

    function boldFieldBullets(section, labelRe) {
      const raw = boldFieldBlock(section, labelRe);
      return raw
        .split("\n")
        .map(l => l.replace(/^[\s\d\-*.•)]+/, "").trim())
        .filter(l => l.length > 3);
    }

    const udemyData = {
      title:        boldFieldLine(sec1, "العنوان[^*]*"),
      description:  boldFieldBlock(sec1, "الوصف[^*]*").replace(/\n/g, " ").trim(),
      keywords:     boldFieldLine(sec1, "[^*]*كلمات[^*]*"),
      audience:     boldFieldBullets(sec1, "الجمهور[^*]*").join("، "),
      requirements: boldFieldBullets(sec1, "متطلبات[^*]*").join("، "),
      outcomes:     boldFieldBullets(sec1, "ماذا[^*]*")
    };

    if (!udemyData.title) return null;

    /* ─────────────────────────────
       SECTION 2 — OUTLINE
       ───────────────────────────── */

    const parts = [];
    const partRe = /\*\*القسم\s+\S+:\s*(.+?)\*\*[ \t]*\n([\s\S]*?)(?=\n\*\*القسم|\n##|$)/g;
    let pm;
    let pIdx = 1;
    let lectureOffset = 0; // running global-number offset per part
    while ((pm = partRe.exec(sec2)) !== null) {
      const pTitle   = pm[1].trim();
      const pContent = pm[2];
      const relNums  = [];
      for (const line of pContent.split("\n")) {
        const lm = line.match(/المحاضرة\s+(\d+)/);
        if (lm) relNums.push(parseInt(lm[1], 10));
      }
      // Convert relative numbers to global numbers using the running offset
      const maxRel  = relNums.length > 0 ? Math.max(...relNums) : 0;
      const lecNums = relNums.map(n => n + lectureOffset);
      lectureOffset += maxRel;
      parts.push({ number: pIdx++, title: pTitle, lectureNumbers: lecNums });
    }

    /* ─────────────────────────────
       SECTION 3 — LECTURE SCRIPTS
       ───────────────────────────── */

    const lectureScripts = {};

    /* Split sec3 on each lecture marker so we can process blocks */
    const lecMarkerRe = /==\s*المحاضرة\s+(\d+):\s*(.+?)\s*==/g;
    const lecMatches  = [...sec3.matchAll(lecMarkerRe)];

    for (let i = 0; i < lecMatches.length; i++) {
      const lm      = lecMatches[i];
      const num     = parseInt(lm[1], 10);
      const lTitle  = lm[2].trim();
      const blockStart = lm.index;
      const blockEnd   = i + 1 < lecMatches.length ? lecMatches[i + 1].index : sec3.length;
      const block      = sec3.substring(blockStart, blockEnd);

      /* Duration */
      const durM    = block.match(/\*\*المدة[^*]*:\s*(\d+)/);
      const duration = durM ? durM[1] + " دقيقة" : "";

      /* Script body (everything after [السكريبت]) */
      const scriptTagIdx = block.indexOf("[السكريبت]");
      let script = "";
      if (scriptTagIdx !== -1) {
        script = block.substring(scriptTagIdx + "[السكريبت]".length).trim();
      } else {
        script = block.replace(/==.+?==/g, "").replace(/\*\*المدة.+?\*\*/g, "").trim();
      }

      /* Try to extract an embedded exercise paragraph */
      let exercise = null;
      const exRe = /(التمرين(?:\s+العملي)?[\s:：]*|تمرين\s+عملي[\s:：]*)([\s\S]{40,600}?)(?=\n\n|\nفي المحاضرة|\nتذكر:|\nفي القسم|$)/i;
      const exM  = script.match(exRe);
      if (exM) {
        const exText  = exM[2].trim();
        const exSteps = exText
          .split(/\n/)
          .map(l => l.replace(/^[\s\d\-*.•)]+/, "").trim())
          .filter(l => l.length > 8)
          .slice(0, 6);
        if (exSteps.length > 0) {
          exercise = { title: "تمرين عملي", bullets: exSteps };
        }
      }

      lectureScripts[num] = { number: num, title: lTitle, duration, script, exercise };
    }

    /* ─────────────────────────────
       SECTION 4 — SLIDES
       ───────────────────────────── */

    const lectureSlides = {};

    const slideSecRe = /==\s*سلايدات المحاضرة\s+(\d+):.+?==/g;
    const slideSecMatches = [...sec4.matchAll(slideSecRe)];

    for (let i = 0; i < slideSecMatches.length; i++) {
      const ssm      = slideSecMatches[i];
      const lNum     = parseInt(ssm[1], 10);
      const ssStart  = ssm.index;
      const ssEnd    = i + 1 < slideSecMatches.length ? slideSecMatches[i + 1].index : sec4.length;
      const ssBlock  = sec4.substring(ssStart, ssEnd);

      const slides    = [];
      const slideRe   = /(?:سلايدة|الشريحة)\s+(\d+):\s*\n([\s\S]*?)(?=\n(?:سلايدة|الشريحة)\s+\d+:|$)/g;
      let sm;
      while ((sm = slideRe.exec(ssBlock)) !== null) {
        const sBlock   = sm[2];
        const titleM   = sBlock.match(/العنوان:\s*(.+)/);
        const sTitle   = titleM ? titleM[1].trim() : "";
        const bulletsM = sBlock.match(/النقاط:\s*\n([\s\S]*)/);
        const bullets  = bulletsM
          ? bulletsM[1].split("\n").map(l => l.replace(/^[-*•]\s*/, "").trim()).filter(l => l.length > 0)
          : [];
        slides.push({ number: parseInt(sm[1], 10), title: sTitle, bullets });
      }
      lectureSlides[lNum] = slides;
    }

    /* ─────────────────────────────
       MERGE → lectures array
       ───────────────────────────── */

    const allNums = new Set([
      ...Object.keys(lectureScripts).map(Number),
      ...Object.keys(lectureSlides).map(Number)
    ]);

    const lectures = [];
    for (const num of [...allNums].sort((a, b) => a - b)) {
      const ls     = lectureScripts[num] || {};
      const slides = lectureSlides[num]  || [];
      const part   = parts.find(p => p.lectureNumbers.includes(num));
      const partNum  = part ? part.number  : Math.ceil(num / 6);
      const partTitle = part ? part.title  : "";

      lectures.push({
        number:    num,
        title:     ls.title    || "",
        duration:  ls.duration || "",
        part:      partNum,
        partTitle,
        script:    ls.script   || "",
        slides,
        exercise:  ls.exercise || null
      });
    }

    return { udemyData, outline: { parts }, lectures };

  } catch (err) {
    console.error("parseCourseFile error:", err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────
   ARTICLE NUMBER → LECTURE + TEMPLATE
   ───────────────────────────────────────────────────────── */

function resolveArticle(articleNum, parsed) {
  // articleNum: 1-200
  // Returns { type: "lecture", lecture, templateIndex } or { type: "course", subType }
  if (articleNum < 1 || articleNum > 200) return null;

  if (articleNum <= 192) {
    const lectureIndex = Math.ceil(articleNum / 8) - 1;
    const templateIndex = ((articleNum - 1) % 8) + 1; // 1-8
    const lecture = parsed.lectures[lectureIndex];
    if (!lecture) return null;
    return { type: "lecture", lecture, templateIndex };
  }

  // 193-200: course-level
  const subTypes = [
    "intro", "audience", "outcomes", "faq",
    "beginner", "howtostart", "keytakeaways", "index"
  ];
  return { type: "course", subType: subTypes[articleNum - 193] };
}

/* ─────────────────────────────────────────────────────────
   HELPER UTILITIES
   ───────────────────────────────────────────────────────── */

function scriptSentences(script, maxSentences) {
  // Split script into sentences for varied use in templates
  const sentences = script
    .split(/[.!؟\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
  if (!maxSentences) return sentences;
  return sentences.slice(0, maxSentences);
}

function bulletHtml(bullets) {
  if (!bullets || bullets.length === 0) return "";
  return "<ul>" + bullets.map(b => `<li>${b}</li>`).join("") + "</ul>";
}

function numberedHtml(bullets) {
  if (!bullets || bullets.length === 0) return "";
  return "<ol>" + bullets.map(b => `<li>${b}</li>`).join("") + "</ol>";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Strip trailing Arabic/Latin punctuation from lecture titles so we don't
   get double question marks in generated article titles (e.g. "؟؟" or "??") */
function cleanTitle(t) {
  return String(t).replace(/[؟?!.\s]+$/, "").trim();
}

/* ─────────────────────────────────────────────────────────
   8 LECTURE ARTICLE TEMPLATES
   ───────────────────────────────────────────────────────── */

/** Template 1 — ما هو [topic]؟ */
function generateWhatIsArticle(lecture) {
  const title = `ما هو ${cleanTitle(lecture.title)}؟ دليل شامل للمبتدئين`;
  const sentences = scriptSentences(lecture.script, 6);
  const firstSlide = lecture.slides[0];
  const allBullets = lecture.slides.flatMap(s => s.bullets).slice(0, 6);

  let body = `<h2>تعريف ${escHtml(lecture.title)}</h2>`;
  if (sentences.length > 0) {
    body += `<p>${escHtml(sentences[0])}.</p>`;
  }
  if (sentences.length > 1) {
    body += `<p>${escHtml(sentences[1])}.</p>`;
  }

  body += `<h2>أهم ما تحتاج معرفته</h2>`;
  if (firstSlide) {
    body += `<p><strong>${escHtml(firstSlide.title)}</strong></p>`;
    body += bulletHtml(firstSlide.bullets.slice(0, 4));
  }

  body += `<h2>العناصر الأساسية</h2>`;
  body += bulletHtml(allBullets);

  if (sentences.length > 2) {
    body += `<h2>لماذا يهمك هذا الموضوع؟</h2>`;
    body += `<p>${escHtml(sentences[2])}.</p>`;
    if (sentences[3]) body += `<p>${escHtml(sentences[3])}.</p>`;
  }

  if (lecture.exercise) {
    body += `<h2>تطبيق عملي: ${escHtml(lecture.exercise.title)}</h2>`;
    body += numberedHtml(lecture.exercise.bullets.slice(0, 4));
  }

  body += `<blockquote>الفهم العميق لـ${escHtml(lecture.title)} هو الخطوة الأولى نحو إتقانه.</blockquote>`;

  return { title, body };
}

/** Template 2 — كيف تطبق [topic]؟ */
function generateHowToArticle(lecture) {
  const title = `كيف تطبق ${cleanTitle(lecture.title)}؟ خطوات عملية مجربة`;
  const sentences = scriptSentences(lecture.script, 8);

  let body = `<h2>لماذا التطبيق العملي يصنع الفارق؟</h2>`;
  if (sentences[0]) body += `<p>${escHtml(sentences[0])}.</p>`;

  body += `<h2>الخطوات التفصيلية لتطبيق ${escHtml(lecture.title)}</h2>`;

  const allBullets = lecture.slides.flatMap(s => s.bullets);
  if (allBullets.length > 0) {
    body += numberedHtml(allBullets.slice(0, 7));
  } else if (sentences.length > 2) {
    const steps = sentences.slice(1, 6).map(s => s + ".");
    body += numberedHtml(steps);
  }

  lecture.slides.slice(0, 3).forEach(slide => {
    body += `<h2>${escHtml(slide.title)}</h2>`;
    body += bulletHtml(slide.bullets);
  });

  if (sentences.length > 4) {
    body += `<h2>نصائح للتطبيق الناجح</h2>`;
    body += `<p>${escHtml(sentences[4])}.</p>`;
    if (sentences[5]) body += `<p>${escHtml(sentences[5])}.</p>`;
  }

  if (lecture.exercise) {
    body += `<h2>تمرين مباشر: ${escHtml(lecture.exercise.title)}</h2>`;
    body += `<p>طبّق ما تعلمته الآن بهذا التمرين:</p>`;
    body += numberedHtml(lecture.exercise.bullets);
  }

  body += `<blockquote>المعرفة بدون تطبيق كالشجرة بدون ثمر — ابدأ بخطوة واحدة اليوم.</blockquote>`;

  return { title, body };
}

/** Template 3 — لماذا [topic] مهم؟ */
function generateWhyArticle(lecture) {
  const title = `لماذا ${cleanTitle(lecture.title)} مهم لحياتك المهنية والشخصية؟`;
  const sentences = scriptSentences(lecture.script, 8);

  let body = `<h2>الصورة الكبيرة</h2>`;
  if (sentences[0]) body += `<p>${escHtml(sentences[0])}.</p>`;
  if (sentences[1]) body += `<p>${escHtml(sentences[1])}.</p>`;

  body += `<h2>الأسباب الحقيقية التي تجعل ${escHtml(lecture.title)} ضرورياً</h2>`;

  const reasons = [];
  lecture.slides.forEach(slide => {
    reasons.push(`<strong>${slide.title}:</strong> ${slide.bullets.slice(0,2).join("، ")}.`);
  });
  if (reasons.length > 0) {
    body += "<ul>" + reasons.slice(0, 5).map(r => `<li>${r}</li>`).join("") + "</ul>";
  }

  if (sentences.length > 2) {
    body += `<h2>التكلفة الحقيقية لتجاهل هذا الموضوع</h2>`;
    body += `<p>${escHtml(sentences[2])}.</p>`;
    if (sentences[3]) body += `<p>${escHtml(sentences[3])}.</p>`;
  }

  if (sentences.length > 4) {
    body += `<h2>ماذا يحدث عندما تُتقن ${escHtml(lecture.title)}؟</h2>`;
    body += `<p>${escHtml(sentences[4])}.</p>`;
    if (sentences[5]) body += `<p>${escHtml(sentences[5])}.</p>`;
  }

  body += `<blockquote>الأشخاص الناجحون لا يتساءلون "لماذا؟" — بل يتساءلون "كيف أبدأ الآن؟"</blockquote>`;

  return { title, body };
}

/** Template 4 — أخطاء شائعة في [topic] */
function generateMistakesArticle(lecture) {
  const title = `أكثر الأخطاء شيوعاً في ${cleanTitle(lecture.title)} وكيف تتجنبها`;
  const sentences = scriptSentences(lecture.script, 8);
  const allBullets = lecture.slides.flatMap(s => s.bullets);

  let body = `<h2>كلنا نقع في هذه الأخطاء في البداية</h2>`;
  if (sentences[0]) body += `<p>${escHtml(sentences[0])}.</p>`;

  const mistakes = [
    "الاستعجال في التطبيق قبل الفهم الكامل",
    "تجاهل الممارسة المنتظمة والاكتفاء بالقراءة",
    "المقارنة بالآخرين بدلاً من التركيز على التقدم الشخصي",
    "التوقف عند أول عقبة بدلاً من البحث عن حلول",
    "إهمال المراجعة الدورية لما تم تعلمه"
  ];

  // Mix with slide bullets as additional mistakes
  const slideMistakes = allBullets.slice(0, 3).map(b => `عدم الانتباه إلى: ${b}`);
  const allMistakes = [...mistakes, ...slideMistakes].slice(0, 6);

  body += `<h2>الأخطاء الستة الأكثر شيوعاً</h2>`;
  allMistakes.forEach((m, i) => {
    body += `<h3>${i + 1}. ${escHtml(m)}</h3>`;
    if (sentences[i + 1]) {
      body += `<p>${escHtml(sentences[i + 1])}.</p>`;
    } else {
      body += `<p>هذا الخطأ يمكن تجنبه بالتخطيط المسبق والالتزام بالخطوات المجربة.</p>`;
    }
  });

  body += `<h2>الحل الصحيح خطوة بخطوة</h2>`;
  lecture.slides.slice(0, 2).forEach(slide => {
    body += `<p><strong>${escHtml(slide.title)}:</strong></p>`;
    body += bulletHtml(slide.bullets.slice(0, 3));
  });

  if (lecture.exercise) {
    body += `<h2>تمرين لتجنب الأخطاء: ${escHtml(lecture.exercise.title)}</h2>`;
    body += numberedHtml(lecture.exercise.bullets);
  }

  body += `<blockquote>الخطأ الحقيقي الوحيد هو الذي لا تتعلم منه شيئاً.</blockquote>`;

  return { title, body };
}

/** Template 5 — نصائح عملية في [topic] */
function generateTipsArticle(lecture) {
  const allBullets = lecture.slides.flatMap(s => s.bullets);
  const count = Math.max(allBullets.length, 5);
  const title = `${count} نصيحة عملية ستغير أسلوبك في ${cleanTitle(lecture.title)}`;
  const sentences = scriptSentences(lecture.script, 4);

  let body = `<h2>نصائح مجربة من الخبراء</h2>`;
  if (sentences[0]) body += `<p>${escHtml(sentences[0])}.</p>`;

  if (allBullets.length > 0) {
    allBullets.forEach((bullet, i) => {
      body += `<h3>${i + 1}. ${escHtml(bullet)}</h3>`;
      if (i < 3 && sentences[i + 1]) {
        body += `<p>${escHtml(sentences[i + 1])}.</p>`;
      } else {
        body += `<p>طبّق هذه النصيحة يومياً لمدة أسبوع واحد وستلاحظ الفرق بنفسك.</p>`;
      }
    });
  } else {
    const defaultTips = [
      `ابدأ بفهم الأساسيات قبل التعمق في ${lecture.title}`,
      "خصّص وقتاً يومياً ثابتاً للتطبيق والمراجعة",
      "اطلب التغذية الراجعة من المختصين في مجالك",
      "وثّق تقدمك وتحدياتك في مذكرة خاصة",
      "شارك ما تتعلمه مع الآخرين لتعزيز الفهم"
    ];
    defaultTips.forEach((t, i) => {
      body += `<h3>${i + 1}. ${escHtml(t)}</h3>`;
      body += `<p>هذه النصيحة ثبتت فعاليتها مع آلاف المتعلمين في هذا المجال.</p>`;
    });
  }

  if (lecture.exercise) {
    body += `<h2>ضع النصائح موضع التنفيذ: ${escHtml(lecture.exercise.title)}</h2>`;
    body += numberedHtml(lecture.exercise.bullets);
  }

  body += `<blockquote>النصيحة الأفضل هي التي تُطبّقها الآن، لا التي تحفظها لغداً.</blockquote>`;

  return { title, body };
}

/** Template 6 — أمثلة واقعية على [topic] */
function generateExamplesArticle(lecture) {
  const title = `أمثلة واقعية على ${cleanTitle(lecture.title)} تُوضح المفهوم ببساطة`;
  const sentences = scriptSentences(lecture.script, 8);

  let body = `<h2>لماذا الأمثلة مهمة في فهم ${escHtml(lecture.title)}؟</h2>`;
  if (sentences[0]) body += `<p>${escHtml(sentences[0])}.</p>`;

  const exampleContexts = [
    "في بيئة العمل المهنية",
    "في الحياة الشخصية والعلاقات",
    "عند التفاوض والإقناع",
    "في سياق التعلم والتطوير",
    "عند مواجهة التحديات"
  ];

  lecture.slides.forEach((slide, i) => {
    const context = exampleContexts[i] || `في السياق ${i + 1}`;
    body += `<h2>مثال ${i + 1}: ${escHtml(slide.title)} ${context}</h2>`;
    if (sentences[i + 1]) {
      body += `<p>${escHtml(sentences[i + 1])}.</p>`;
    }
    body += bulletHtml(slide.bullets);
  });

  if (sentences.length > 5) {
    body += `<h2>الدرس المستفاد من هذه الأمثلة</h2>`;
    body += `<p>${escHtml(sentences[5])}.</p>`;
    if (sentences[6]) body += `<p>${escHtml(sentences[6])}.</p>`;
  }

  if (lecture.exercise) {
    body += `<h2>أنشئ مثالك الخاص: ${escHtml(lecture.exercise.title)}</h2>`;
    body += `<p>أفضل طريقة لفهم الأمثلة هي أن تبتكر مثالاً من واقع حياتك:</p>`;
    body += numberedHtml(lecture.exercise.bullets);
  }

  body += `<blockquote>المثال الواقعي يساوي ألف شرح نظري — ابحث عن أمثلتك في حياتك اليومية.</blockquote>`;

  return { title, body };
}

/** Template 7 — الفرق بين [topic] و[adjacent topic] */
function generateComparisonArticle(lecture, allLectures) {
  // Find adjacent lecture in same part
  const samePart = allLectures.filter(l => l.part === lecture.part && l.number !== lecture.number);
  const adjacent = samePart.find(l => l.number === lecture.number + 1)
    || samePart.find(l => l.number === lecture.number - 1)
    || allLectures.find(l => l.number !== lecture.number);

  const otherTitle = adjacent ? cleanTitle(adjacent.title) : "المفاهيم المجاورة";
  const title = `الفرق بين ${cleanTitle(lecture.title)} و${otherTitle}: مقارنة تفصيلية`;
  const sentences = scriptSentences(lecture.script, 6);
  const otherSentences = adjacent ? scriptSentences(adjacent.script, 4) : [];

  let body = `<h2>فهم الفرق يصنع الخبير</h2>`;
  if (sentences[0]) body += `<p>${escHtml(sentences[0])}.</p>`;

  body += `<h2>${escHtml(lecture.title)}: التعريف والخصائص</h2>`;
  if (sentences[1]) body += `<p>${escHtml(sentences[1])}.</p>`;
  const lBullets = lecture.slides.flatMap(s => s.bullets).slice(0, 4);
  body += bulletHtml(lBullets);

  body += `<h2>${escHtml(otherTitle)}: التعريف والخصائص</h2>`;
  if (otherSentences[0]) {
    body += `<p>${escHtml(otherSentences[0])}.</p>`;
    const oBullets = adjacent ? adjacent.slides.flatMap(s => s.bullets).slice(0, 4) : [];
    body += bulletHtml(oBullets);
  } else {
    body += `<p>يرتبط هذا المفهوم ارتباطاً وثيقاً بـ${escHtml(lecture.title)}، لكن له تطبيقات وسياقات مختلفة.</p>`;
  }

  body += `<h2>أوجه الشبه والاختلاف</h2>`;
  body += `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead><tr>
      <th style="background:var(--bg-card2);padding:10px;border:1px solid var(--border);text-align:right;">الجانب</th>
      <th style="background:var(--bg-card2);padding:10px;border:1px solid var(--border);text-align:right;">${escHtml(lecture.title)}</th>
      <th style="background:var(--bg-card2);padding:10px;border:1px solid var(--border);text-align:right;">${escHtml(otherTitle)}</th>
    </tr></thead>
    <tbody>
      <tr>
        <td style="padding:10px;border:1px solid var(--border);">الهدف</td>
        <td style="padding:10px;border:1px solid var(--border);">${lecture.slides[0] ? escHtml(lecture.slides[0].title) : "التطبيق المباشر"}</td>
        <td style="padding:10px;border:1px solid var(--border);">${adjacent && adjacent.slides[0] ? escHtml(adjacent.slides[0].title) : "التطوير الشامل"}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid var(--border);">الاستخدام</td>
        <td style="padding:10px;border:1px solid var(--border);">متخصص ومحدد</td>
        <td style="padding:10px;border:1px solid var(--border);">أوسع نطاقاً</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid var(--border);">متى تستخدمه؟</td>
        <td style="padding:10px;border:1px solid var(--border);">${lBullets[0] ? escHtml(lBullets[0].substring(0, 40)) + "..." : "في السياقات التخصصية"}</td>
        <td style="padding:10px;border:1px solid var(--border);">في السياقات الأشمل</td>
      </tr>
    </tbody>
  </table>`;

  if (sentences.length > 3) {
    body += `<h2>متى تختار أيهما؟</h2>`;
    body += `<p>${escHtml(sentences[3])}.</p>`;
    if (sentences[4]) body += `<p>${escHtml(sentences[4])}.</p>`;
  }

  body += `<blockquote>التمييز الدقيق بين المفاهيم هو ما يُفرّق المبتدئ عن المحترف.</blockquote>`;

  return { title, body };
}

/** Template 8 — دليلك الكامل لـ[topic] */
function generateGuideArticle(lecture) {
  const title = `دليلك الكامل لـ${cleanTitle(lecture.title)}: من الصفر إلى الإتقان`;
  const sentences = scriptSentences(lecture.script);

  let body = `<h2>مقدمة: ما ستتعلمه في هذا الدليل</h2>`;
  if (sentences[0]) body += `<p>${escHtml(sentences[0])}.</p>`;
  if (sentences[1]) body += `<p>${escHtml(sentences[1])}.</p>`;

  body += `<h2>الجزء الأول: الأسس والمفاهيم</h2>`;
  if (sentences[2]) body += `<p>${escHtml(sentences[2])}.</p>`;
  if (sentences[3]) body += `<p>${escHtml(sentences[3])}.</p>`;

  lecture.slides.forEach((slide, i) => {
    body += `<h2>الجزء ${i + 2}: ${escHtml(slide.title)}</h2>`;
    body += bulletHtml(slide.bullets);
    if (sentences[4 + i]) {
      body += `<p>${escHtml(sentences[4 + i])}.</p>`;
    }
  });

  if (lecture.exercise) {
    body += `<h2>الجزء العملي: ${escHtml(lecture.exercise.title)}</h2>`;
    body += `<p>هذا التمرين يجمع كل ما تعلمته في خطوات قابلة للتنفيذ الفوري:</p>`;
    body += numberedHtml(lecture.exercise.bullets);
  }

  body += `<h2>خلاصة الدليل: النقاط الأساسية</h2>`;
  const allBullets = lecture.slides.flatMap(s => s.bullets).slice(0, 6);
  body += bulletHtml(allBullets);

  if (sentences.length > 7) {
    body += `<h2>الخطوة التالية</h2>`;
    body += `<p>${escHtml(sentences[sentences.length - 1])}.</p>`;
  }

  body += `<blockquote>الدليل الكامل ليس للحفظ — بل للرجوع إليه في كل مرحلة من مراحل التطبيق.</blockquote>`;

  return { title, body };
}

/* ─────────────────────────────────────────────────────────
   COURSE-LEVEL ARTICLES (193-200)
   ───────────────────────────────────────────────────────── */

function generateCourseArticle(subType, parsed, courseSlug) {
  const ud = parsed.udemyData;

  switch (subType) {
    case "intro": {
      const title = `نظرة عامة شاملة على كورس ${ud.title}`;
      let body = `<h2>عن هذا الكورس</h2><p>${escHtml(ud.description)}</p>`;
      body += `<h2>ما الذي يميز هذا الكورس؟</h2>`;
      body += `<p>يُقدم هذا الكورس محتوى عملياً ومنظماً يُساعدك على اكتساب مهارات حقيقية قابلة للتطبيق مباشرة في حياتك المهنية والشخصية.</p>`;
      body += `<h2>لماذا اخترنا هذا المحتوى؟</h2>`;
      body += bulletHtml(ud.outcomes.slice(0, 5));
      body += `<h2>ما يشمله الكورس</h2>`;
      body += `<p>${parsed.lectures.length} محاضرة موزعة على ${parsed.outline.parts.length} أجزاء رئيسية، تغطي المفاهيم من الأساسية إلى المتقدمة.</p>`;
      parsed.outline.parts.forEach(part => {
        body += `<h3>الجزء ${part.number}: ${escHtml(part.title)}</h3>`;
      });
      body += `<blockquote>هذا ليس مجرد كورس — بل هو بداية تحول حقيقي في مهاراتك ومسيرتك.</blockquote>`;
      return { title, body };
    }

    case "audience": {
      const title = `لمن هذا الكورس؟ تعرف إذا كان ${ud.title} مناسباً لك`;
      let body = `<h2>الجمهور المستهدف</h2><p>${escHtml(ud.audience)}</p>`;
      body += `<h2>إذا كنت من هؤلاء، فهذا الكورس لك</h2>`;
      body += `<ul>
        <li>تريد تطوير مهاراتك المهنية بأسلوب عملي ومباشر</li>
        <li>لديك وقت محدود ولا تريد الضياع في محتوى غير مفيد</li>
        <li>تبحث عن نتائج قابلة للقياس وتطبيق فوري</li>
        <li>مستعد للاستثمار في نفسك وتطوير قدراتك</li>
      </ul>`;
      body += `<h2>المتطلبات الأساسية</h2><p>${escHtml(ud.requirements)}</p>`;
      body += `<h2>ما ستكون عليه بعد الانتهاء</h2>`;
      body += bulletHtml(ud.outcomes.slice(0, 6));
      body += `<blockquote>لا يهم من أين تبدأ — المهم أن تبدأ.</blockquote>`;
      return { title, body };
    }

    case "outcomes": {
      const title = `ماذا ستتعلم من كورس ${ud.title}؟ النتائج الثمانية الكاملة`;
      let body = `<h2>نتائج التعلم المضمونة</h2>`;
      body += `<p>عند إتمامك لهذا الكورس، ستكون قادراً على تحقيق هذه النتائج الثمانية بشكل كامل:</p>`;
      ud.outcomes.forEach((outcome, i) => {
        body += `<h2>${i + 1}. ${escHtml(outcome)}</h2>`;
        body += `<p>هذه النتيجة تُبنى على محاضرات متعددة تنقلك من الفهم النظري إلى التطبيق العملي الفعلي.</p>`;
      });
      body += `<h2>كيف نضمن هذه النتائج؟</h2>`;
      body += `<p>كل محاضرة تتضمن شرحاً واضحاً + تطبيقاً عملياً + تمريناً قابلاً للتنفيذ الفوري. لا مجال للنظرية الفارغة.</p>`;
      body += `<blockquote>النتيجة الحقيقية تُقاس بما تفعله بعد الكورس، لا بما تعرفه أثناءه.</blockquote>`;
      return { title, body };
    }

    case "faq": {
      const title = `أسئلة شائعة حول كورس ${ud.title} — كل ما تريد معرفته`;
      const faqs = [
        {
          q: `هل أحتاج خبرة سابقة لأستفيد من كورس ${ud.title}؟`,
          a: `${ud.requirements || "لا تحتاج خبرة سابقة"} — الكورس مُصمم ليناسب المستويات المختلفة ويبدأ من الأساسيات.`
        },
        {
          q: "كم من الوقت أحتاج لإتمام الكورس؟",
          a: `يمكنك إتمامه بوتيرتك الخاصة. معظم الطلاب يُنهونه في 2-4 أسابيع بمعدل ساعة يومياً.`
        },
        {
          q: "هل المحتوى محدّث ويواكب المتطلبات الحالية؟",
          a: "نعم، المحتوى مراجَع ومُحدَّث باستمرار ليعكس أفضل الممارسات الحالية في المجال."
        },
        {
          q: `لمن يناسب ${ud.title} بشكل أكبر؟`,
          a: `${ud.audience || "يناسب الجميع الراغبين في تطوير أنفسهم"} — سواء كنت مبتدئاً أو متوسطاً.`
        },
        {
          q: "هل هناك شهادة إتمام؟",
          a: "نعم، تحصل على شهادة إتمام معتمدة من Udemy يمكن إضافتها لملفك المهني على LinkedIn."
        }
      ];
      let body = `<h2>أسئلة الطلاب الأكثر شيوعاً</h2>`;
      faqs.forEach(faq => {
        body += `<h3>س: ${escHtml(faq.q)}</h3><p><strong>ج:</strong> ${escHtml(faq.a)}</p>`;
      });
      body += `<h2>هل لديك سؤال آخر؟</h2>`;
      body += `<p>يمكنك طرح أسئلتك مباشرة في قسم الأسئلة والأجوبة داخل الكورس، وسيرد عليك المدرب شخصياً.</p>`;
      body += `<blockquote>السؤال الجيد هو نصف الإجابة.</blockquote>`;
      return { title, body };
    }

    case "beginner": {
      const title = `دليل المبتدئ الكامل لـ${ud.title}: ابدأ من هنا`;
      let body = `<h2>أنت في المكان الصحيح</h2>`;
      body += `<p>إذا كنت مبتدئاً في هذا المجال أو تشعر بالضياع أمام كثرة المعلومات — هذا الدليل كُتب لك تحديداً.</p>`;
      body += `<h2>ما تحتاجه قبل البدء</h2><p>${escHtml(ud.requirements || "لا متطلبات خاصة — فقط الرغبة في التعلم.")}</p>`;
      body += `<h2>من أين تبدأ؟</h2>`;
      body += `<p>ابدأ بالجزء الأول من الكورس الذي يُرسي الأسس. لا تتجاوز أي محاضرة حتى تُتقن التي قبلها.</p>`;
      parsed.outline.parts.slice(0, 2).forEach(part => {
        body += `<h3>الجزء ${part.number}: ${escHtml(part.title)}</h3>`;
        body += `<p>هذا الجزء يُغطي المفاهيم الأساسية التي ستبني عليها كل شيء لاحقاً.</p>`;
      });
      body += `<h2>نصائح للمبتدئ الناجح</h2>`;
      body += `<ul>
        <li>خصص وقتاً ثابتاً يومياً للتعلم ولو 30 دقيقة</li>
        <li>طبّق كل فكرة فور تعلمها — لا تؤجل التطبيق</li>
        <li>اكتب ملاحظاتك بيدك — هذا يُعزز الفهم والحفظ</li>
        <li>لا تقارن تقدمك بتقدم الآخرين — ركّز على رحلتك</li>
      </ul>`;
      body += `<blockquote>كل خبير كان في يوم ما مبتدئاً — الفارق هو أنه لم يتوقف.</blockquote>`;
      return { title, body };
    }

    case "howtostart": {
      const title = `كيف تبدأ اليوم مع ${ud.title}؟ خطوات فورية`;
      let body = `<h2>لا وقت للانتظار</h2>`;
      body += `<p>أكبر خطأ يقع فيه المتعلمون هو تأجيل البدء. هذه الخطوات ستجعلك تبدأ خلال الساعة القادمة.</p>`;
      const steps = [
        `سجّل في الكورس عبر الرابط أدناه وابدأ المحاضرة الأولى فوراً`,
        `خصّص دفتراً أو ملفاً رقمياً لتدوين أهم ما تتعلمه`,
        `التزم بجدول زمني واضح: على الأقل 3 أيام أسبوعياً`,
        `طبّق التمرين العملي في نهاية كل محاضرة قبل الانتقال للتالية`,
        `انضم لمجتمع الطلاب واسأل كلما احتجت مساعدة`,
        `راجع ملاحظاتك أسبوعياً لتثبيت المعلومات`
      ];
      body += `<h2>الخطوات الست للبدء الفوري</h2>`;
      body += numberedHtml(steps);
      body += `<h2>ما ستحققه خلال 30 يوماً</h2>`;
      body += bulletHtml(ud.outcomes.slice(0, 4));
      body += `<h2>وما ستحققه خلال 90 يوماً</h2>`;
      body += bulletHtml(ud.outcomes.slice(4));
      body += `<blockquote>أفضل وقت للبدء كان بالأمس — ثاني أفضل وقت هو الآن.</blockquote>`;
      return { title, body };
    }

    case "keytakeaways": {
      const title = `أبرز ما ستتعلمه من ${ud.title}: النقاط الجوهرية`;
      let body = `<h2>ملخص تنفيذي للكورس</h2>`;
      body += `<p>هذه هي أهم الأفكار التي ستحملها معك بعد إتمام الكورس — وهي وحدها كافية لتحدث فارقاً حقيقياً في مسيرتك.</p>`;
      parsed.lectures.slice(0, 8).forEach(lec => {
        const firstBullets = lec.slides.flatMap(s => s.bullets).slice(0, 2);
        body += `<h2>${escHtml(lec.title)}</h2>`;
        body += bulletHtml(firstBullets);
      });
      body += `<h2>المبادئ العامة التي يرتكز عليها الكورس</h2>`;
      body += bulletHtml(ud.outcomes);
      body += `<blockquote>التعلم الحقيقي لا يكمن في حفظ المعلومة — بل في تحويلها إلى سلوك يومي.</blockquote>`;
      return { title, body };
    }

    case "index": {
      const title = `الفهرس الكامل لكورس ${ud.title}: جميع المحاضرات والمقالات`;
      let body = `<h2>نظرة شاملة على الكورس</h2>`;
      body += `<p>${escHtml(ud.description)}</p>`;
      parsed.outline.parts.forEach(part => {
        body += `<h2>الجزء ${part.number}: ${escHtml(part.title)}</h2>`;
        const partLectures = parsed.lectures.filter(l => l.part === part.number);
        partLectures.forEach(lec => {
          body += `<h3>محاضرة ${lec.number}: ${escHtml(lec.title)}</h3>`;
          body += `<p>المقالات المتاحة: `;
          const startArticle = (lec.number - 1) * 8 + 1;
          const articleLinks = [];
          for (let t = 1; t <= 8; t++) {
            const n = startArticle + t - 1;
            const tNames = ["ما هو؟","كيف تطبق؟","لماذا مهم؟","أخطاء شائعة","نصائح عملية","أمثلة واقعية","مقارنة","دليل كامل"];
            articleLinks.push(`<a href="article.html?course=${encodeURIComponent(courseSlug)}&article=${n}">${tNames[t-1]}</a>`);
          }
          body += articleLinks.join(" | ") + "</p>";
        });
      });
      body += `<h2>المقالات الشاملة للكورس</h2>`;
      const courseArticleNames = ["مقدمة وعرض عام","الجمهور المستهدف","النتائج الثمانية","أسئلة شائعة","دليل المبتدئ","كيف تبدأ اليوم؟","أبرز ما ستتعلمه","الفهرس الكامل"];
      courseArticleNames.forEach((name, i) => {
        body += `<p><a href="article.html?course=${encodeURIComponent(courseSlug)}&article=${193 + i}">${name}</a></p>`;
      });
      return { title, body };
    }

    default:
      return null;
  }
}

/* ─────────────────────────────────────────────────────────
   MAIN ENTRY POINT
   ───────────────────────────────────────────────────────── */

/**
 * generateArticle(articleNum, parsed, courseSlug)
 * Returns { title, body } or null if invalid.
 */
function generateArticle(articleNum, parsed, courseSlug) {
  if (!parsed) return null;
  const resolved = resolveArticle(articleNum, parsed);
  if (!resolved) return null;

  if (resolved.type === "course") {
    return generateCourseArticle(resolved.subType, parsed, courseSlug);
  }

  const { lecture, templateIndex } = resolved;
  const templateFns = [
    null, // 0-indexed padding
    generateWhatIsArticle,
    generateHowToArticle,
    generateWhyArticle,
    generateMistakesArticle,
    generateTipsArticle,
    generateExamplesArticle,
    (lec) => generateComparisonArticle(lec, parsed.lectures),
    generateGuideArticle
  ];

  const fn = templateFns[templateIndex];
  if (!fn) return null;
  return fn(lecture);
}
