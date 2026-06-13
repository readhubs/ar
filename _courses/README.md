# _courses/

Drop your course .txt files here (DeepSeek output format).

## How it works

1. Upload / commit a .txt file to this folder.
2. GitHub Actions detects the new file and runs automatically.
3. The action generates:
   - courses/<slug>/index.html  (course landing page)
   - courses/<slug>/articles/   (200 SEO HTML articles)
   - Updates courses-data.js    (adds course entry)
   - Updates sitemap.xml        (adds article URLs)
4. GitHub Pages re-deploys automatically with the new content.

## File format requirements

- UTF-8 encoding (not Windows ANSI)
- Exactly 24 lectures
- Sections: أولاً, ثانياً, ثالثاً, رابعاً, خامساً
- Lecture scripts under: == المحاضرة N: title ==
- Slides under: == سلايدات المحاضرة N: ==

## Check results

After the action runs, the new course will be live at:
  https://readhubs.github.io/ar/courses/<slug>/
