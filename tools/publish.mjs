// 一键发布脚本 v4：整库同步 + 静态渲染（干净网址）+ 自动推送
// 产物：
//   posts/<slug>.md   —— 规范化文章源
//   post/<slug>.html  —— 每篇文章的静态网页（网址 /post/<slug>，无需 ?slug=）
//   <name>.html       —— 独立页面（/about /now /discover）
//   posts/index.json  —— 首页与归档的列表数据
// 规则：普通 .md → 文章；page- 开头 → 页面；_ 开头忽略；published: false 跳过
// [[链接]] 自动转 /post/<slug> 网页链接；标题改动网页自动更新，网址由 slugs.json 记住
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "posts");
const pagesDir = join(root, "pages");
const postHtmlDir = join(root, "post");
const configPath = join(root, "publish-config.json");
const tokenPath = join(root, ".publish-token.txt");
const slugsPath = join(root, "slugs.json");
const dryRun = process.argv.includes("--dry-run");
const SITE_NAME = "纪遇的花";

console.log("==========================================");
console.log("  纪遇的花 · 一键发布");
console.log("==========================================");

let config = { github: { owner: "MYResse", repo: "Jiyu.blog" } };
if (existsSync(configPath)) {
  try { config = Object.assign(config, JSON.parse(readFileSync(configPath, "utf8"))); } catch (e) {}
}
const sourceDir = String(config.sourceDir || "").replace(/\\/g, "/");
if (!sourceDir || !existsSync(sourceDir)) {
  console.log("");
  console.log("【首次使用】请先配置 Obsidian 写作库路径（编辑 " + configPath + "）。");
  console.log('  例如：{ "sourceDir": "E:/Obsidian/信息流/写作库" }');
  process.exit(0);
}

let slugsCache = {};
if (existsSync(slugsPath)) {
  try { slugsCache = JSON.parse(readFileSync(slugsPath, "utf8")); } catch (e) {}
}

// ================= 工具函数 =================
function parseMeta(src) {
  const meta = { title: "", slug: "", date: "", tags: [], categories: [], summary: "", featured: false, published: true };
  const m = src.match(/^\s*---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!m) return meta;
  const lines = m[1].split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^\s*([\w-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim().replace(/^["']|["']$/g, "");
    if (key === "tags") {
      if (val.startsWith("[")) meta.tags = val.replace(/[\[\]]/g, "").split(",").map((t) => t.trim()).filter(Boolean);
      else if (val === "") { const l = []; while (i + 1 < lines.length && /^\s+-\s+.+/.test(lines[i + 1])) { l.push(lines[i + 1].replace(/^\s+-\s+/, "").trim()); i++; } meta.tags = l; }
      else meta.tags = val.split(/\s+/).filter(Boolean);
    } else if (key === "categories" || key === "category") {
      if (val.startsWith("[")) meta.categories = val.replace(/[\[\]]/g, "").split(",").map((t) => t.trim()).filter(Boolean);
      else if (val === "") { const l = []; while (i + 1 < lines.length && /^\s+-\s+.+/.test(lines[i + 1])) { l.push(lines[i + 1].replace(/^\s+-\s+/, "").trim()); i++; } meta.categories = l; }
      else meta.categories = val.split(/[\/,，]/).map((t) => t.trim()).filter(Boolean);
    } else if (key === "title") { meta.title = val; }
    else if (key === "slug") { meta.slug = val; }
    else if (key === "date") { meta.date = val; }
    else if (key === "summary") { meta.summary = val; }
    else if (key === "featured") { meta.featured = val === "true" || val === "yes"; }
    else if (key === "published") { meta.published = val !== "false"; }
  }
  return meta;
}
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function shortHash(s, n) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, n || 6);
}
async function translateTitle(text) {
  if (typeof fetch === "undefined") return "";
  try {
    const r = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text.slice(0, 200)) + "&langpair=zh-CN|en-GB", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return "";
    const j = await r.json();
    const t = (j.responseData && j.responseData.translatedText) || "";
    if (!t || /[\u4e00-\u9fff]/.test(t)) return "";
    return t;
  } catch (e) { return ""; }
}
function cleanSummary(s) {
  return s
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\]\]/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_>#\x60]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

// ================= Markdown → HTML（静态渲染器） =================
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function mdInline(text) {
  let t = escapeHtml(text);
  t = t.replace(/\`([^\`\n]+)\`/g, "<code>$1</code>");
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return t;
}
function mdToHtml(src) {
  const parsed = parseMeta(src);
  const lines = parsed.body || "";
  const ls = lines.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let listType = null;
  let quoteLines = [];
  let codeBuf = null;
  function closeList() { if (listType) { html.push("</" + listType + ">"); listType = null; } }
  function closeQuote() { if (quoteLines.length) { html.push("<blockquote>" + mdToHtml(quoteLines.join("\n")).html + "</blockquote>"); quoteLines = []; } }
  function isBlockStart(line) { return /^(#{1,6}\s|>\s?|\`\`\`|[-*+]\s|\d+[.)]\s|-{3,}$)/.test(line); }
  for (let i = 0; i < ls.length; i++) {
    const line = ls[i];
    const trimmed = line.trim();
    if (codeBuf !== null) {
      if (/^\`\`\`/.test(trimmed)) {
        const langAttr = codeBuf.lang ? ' class="language-' + codeBuf.lang + '"' : "";
        html.push("<pre><code" + langAttr + ">" + escapeHtml(codeBuf.lines.join("\n")) + "</code></pre>");
        codeBuf = null;
      } else { codeBuf.lines.push(line); }
      continue;
    }
    if (/^\`\`\`/.test(trimmed)) { closeList(); closeQuote(); codeBuf = { lang: trimmed.slice(3).trim(), lines: [] }; continue; }
    if (trimmed === "") { closeList(); closeQuote(); continue; }
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) { closeList(); closeQuote(); html.push("<hr>"); continue; }
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) { closeList(); closeQuote(); const lv = h[1].length; html.push("<h" + lv + ">" + mdInline(h[2]) + "</h" + lv + ">"); continue; }
    if (/^>\s?/.test(trimmed)) { closeList(); quoteLines.push(trimmed.replace(/^>\s?/, "")); continue; }
    if (/^[-*+]\s+/.test(trimmed)) {
      closeQuote();
      if (listType !== "ul") { closeList(); html.push("<ul>"); listType = "ul"; }
      html.push("<li>" + mdInline(trimmed.replace(/^[-*+]\s+/, "")) + "</li>");
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      closeQuote();
      if (listType !== "ol") { closeList(); html.push("<ol>"); listType = "ol"; }
      html.push("<li>" + mdInline(trimmed.replace(/^\d+[.)]\s+/, "")) + "</li>");
      continue;
    }
    closeList(); closeQuote();
    const buf = [line];
    while (i + 1 < ls.length && ls[i + 1].trim() !== "" && !isBlockStart(ls[i + 1].trim())) { buf.push(ls[i + 1]); i++; }
    html.push("<p>" + mdInline(buf.join(" ")) + "</p>");
  }
  closeList(); closeQuote();
  if (codeBuf !== null) html.push("<pre><code>" + escapeHtml(codeBuf.lines.join("\n")) + "</code></pre>");
  return { meta: parsed, html: html.join("\n") };
}

function pageHead(title) {
  return '<!DOCTYPE html>\n<html lang="zh-CN" data-theme="light">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + escapeHtml(title) + '</title>\n<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="preconnect" href="https://cdn.jsdelivr.net">\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css">\n<link rel="stylesheet" href="/css/style.css">\n</head>\n<body>\n<div class="page">\n  <header class="site-header" id="site-header"></header>\n  <main>\n';
}
const pageFoot = '  </main>\n  <footer class="site-footer" id="site-footer"></footer>\n</div>\n<script src="/js/common.js"></script>\n</body>\n</html>\n';

function renderPostHtml(entry, prev, next) {
  const title = entry.title || "文章";
  const date = entry.date || "";
  const plain = entry.html.replace(/<[^>]+>/g, "");
  const chars = plain.length;
  const minutes = Math.max(1, Math.round(chars / 400));
  const tagsHtml = (entry.tags || []).map(function (t) { return '<span class="tag-mini">' + escapeHtml(t) + "</span>"; }).join("");
  const navHtml = (prev || next)
    ? '<div class="post-nav">' +
      (prev ? '<a class="prev" href="/post/' + encodeURIComponent(prev.slug) + '"><span class="dir">← 上一篇</span>' + escapeHtml(prev.title) + "</a>" : "<span></span>") +
      (next ? '<a class="next" href="/post/' + encodeURIComponent(next.slug) + '"><span class="dir">下一篇 →</span>' + escapeHtml(next.title) + "</a>" : "<span></span>") +
      "</div>"
    : "";
  return pageHead(title + " · " + SITE_NAME) +
    '<article class="article">' +
    '<a class="back-link" href="/">← 回到首页</a>' +
    "<h1>" + escapeHtml(title) + "</h1>" +
    '<div class="post-meta">' +
    "<span>" + escapeHtml(date) + "</span><span>·</span><span>全文约 " + chars + " 字 · 读完约 " + minutes + " 分钟</span>" +
    (tagsHtml ? '<span class="post-tags">' + tagsHtml + "</span>" : "") +
    "</div>" +
    '<div class="post-content">' + entry.html + "</div>" +
    navHtml +
    '<a class="back-link bottom" href="/">← 回到首页</a>' +
    "</article>" + pageFoot;
}
function renderPageHtml(name, meta, html) {
  const title = meta.title || name;
  return pageHead(title + " · " + SITE_NAME) +
    '<article class="article">' +
    '<a class="back-link" href="/">← 回到首页</a>' +
    "<h1>" + escapeHtml(title) + "</h1>" +
    '<div class="post-content">' + html + "</div>" +
    "</article>" + pageFoot;
}

// ================= 主流程 =================
async function sync() {
  const allFiles = readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith(".md") && !f.startsWith("_"));
  const publishList = [];
  const slugMap = {};
  for (const f of allFiles) {
    const src = readFileSync(join(sourceDir, f), "utf8");
    const meta = parseMeta(src);
    if (meta.published === false) { console.log("⏭ 跳过（published: false）: " + f); continue; }
    publishList.push({ f, meta });
    if (f.startsWith("page-")) continue;
    let slug = "";
    if (meta.slug) slug = slugify(meta.slug);
    else if (slugsCache[f]) slug = slugsCache[f];
    else {
      const base = basename(f, ".md");
      if (/^[a-z0-9-]+$/i.test(base)) slug = base.toLowerCase();
      else {
        const en = await translateTitle(meta.title || base);
        if (en) slug = slugify(en);
        else slug = "post-" + shortHash(f);
      }
    }
    slugMap[f] = slug;
    slugsCache[f] = slug;
  }
  const usedSlugs = {};
  for (const f of Object.keys(slugMap)) {
    let s = slugMap[f];
    if (usedSlugs[s]) s = s + "-" + shortHash(f, 4);
    usedSlugs[s] = true;
    slugMap[f] = s;
    slugsCache[f] = s;
  }
  writeFileSync(slugsPath, JSON.stringify(slugsCache, null, 2) + "\n", "utf8");

  const nameIndex = {};
  for (const f of Object.keys(slugMap)) nameIndex[basename(f, ".md").toLowerCase()] = slugMap[f];
  function convertWikilinks(body) {
    return body.replace(/!?\[\[([^\]|#\n]+)(?:#[^\]|\n]+)?(?:\|([^\]\n]+))?\]\]/g, function (match, target, alias) {
      const seg = String(target).trim().split("/").pop().trim();
      const key = seg.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(nameIndex, key)) {
        const text = alias ? String(alias).trim() : seg;
        return "[" + text + "](/post/" + encodeURIComponent(nameIndex[key]) + ")";
      }
      if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(key)) return "（图片：" + seg + "）";
      return alias ? String(alias).trim() : seg;
    });
  }

  if (!existsSync(pagesDir)) mkdirSync(pagesDir, { recursive: true });
  let postCount = 0, pageCount = 0, linkCount = 0;
  for (const item of publishList) {
    const f = item.f;
    const meta = item.meta;
    const src = readFileSync(join(sourceDir, f), "utf8");
    const isPage = f.startsWith("page-");
    const title = meta.title || basename(f, ".md");
    const stat = statSync(join(sourceDir, f));
    const date = meta.date ? String(meta.date).slice(0, 10) : stat.birthtime.toISOString().slice(0, 10);
    let body = src.replace(/^\s*---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "").trim();
    const rawFirst = body.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("!") && !l.startsWith(">"))[0] || "";
    const before = (body.match(/\[\[/g) || []).length;
    body = convertWikilinks(body);
    linkCount += before;
    const tags = [];
    (meta.tags || []).concat(meta.categories || []).forEach((t) => { if (t && tags.indexOf(t) === -1) tags.push(t); });
    const summary = meta.summary || cleanSummary(rawFirst);
    const fm = ["---", "title: " + title, "date: " + date];
    if (tags.length) fm.push("tags: [" + tags.join(", ") + "]");
    fm.push("summary: " + summary.replace(/\n/g, " "));
    if (meta.featured) fm.push("featured: true");
    let target;
    if (isPage) {
      target = join(pagesDir, f.replace(/^page-/, ""));
      pageCount++;
    } else {
      fm.push("slug: " + slugMap[f]);
      target = join(postsDir, slugMap[f] + ".md");
      postCount++;
    }
    fm.push("---", "", body);
    writeFileSync(target, fm.join("\n") + "\n", "utf8");
  }
  console.log("共处理 " + postCount + " 篇文章、" + pageCount + " 个页面，转换 [[链接]] " + linkCount + " 处。");

  // 建索引（含正文 HTML）
  const entries = [];
  for (const f of readdirSync(postsDir).filter((x) => x.endsWith(".md"))) {
    const src = readFileSync(join(postsDir, f), "utf8");
    const out = mdToHtml(src);
    entries.push({
      slug: f.replace(/\.md$/, ""),
      title: out.meta.title || f,
      date: out.meta.date || "1970-01-01",
      tags: out.meta.tags || [],
      summary: out.meta.summary || "",
      featured: out.meta.featured === true,
      html: out.html
    });
  }
  entries.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.slug < b.slug ? -1 : 1));
  const indexData = entries.map(function (e) {
    return { slug: e.slug, title: e.title, date: e.date, tags: e.tags, summary: e.summary, featured: e.featured };
  });
  writeFileSync(join(postsDir, "index.json"), JSON.stringify(indexData, null, 2) + "\n", "utf8");
  console.log("文章索引已重建（共 " + entries.length + " 篇）。");

  // 渲染每篇文章的静态网页
  if (!existsSync(postHtmlDir)) mkdirSync(postHtmlDir, { recursive: true });
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const prev = i > 0 ? entries[i - 1] : null;
    const next = i < entries.length - 1 ? entries[i + 1] : null;
    writeFileSync(join(postHtmlDir, e.slug + ".html"), renderPostHtml(e, prev, next), "utf8");
  }
  console.log("已渲染 " + entries.length + " 篇静态文章页 → /post/<slug>");

  // 清理已删除文章的旧静态页
  for (const f of readdirSync(postHtmlDir).filter((x) => x.endsWith(".html"))) {
    const slug = f.replace(/\.html$/, "");
    if (!entries.some((e) => e.slug === slug)) { rmSync(join(postHtmlDir, f)); console.log("已清理旧页面: " + f); }
  }

  // 渲染独立页面到根目录（/about /now /discover）
  for (const f of readdirSync(pagesDir).filter((x) => x.endsWith(".md"))) {
    const name = f.replace(/\.md$/, "");
    const out = mdToHtml(readFileSync(join(pagesDir, f), "utf8"));
    writeFileSync(join(root, name + ".html"), renderPageHtml(name, out.meta, out.html), "utf8");
    console.log("已渲染页面: /" + name);
  }
}

function commitAll(msg) {
  execSync("git add -A", { cwd: root, stdio: "pipe" });
  execSync('git commit -m "' + msg + '" --allow-empty', { cwd: root, stdio: "pipe" });
}
function pushOnce() {
  const token = readFileSync(tokenPath, "utf8").trim();
  const owner = config.github.owner;
  const basic = Buffer.from(owner + ":" + token).toString("base64");
  execSync('git -c http.extraheader="AUTHORIZATION: basic ' + basic + '" push origin main', { cwd: root, stdio: "pipe" });
}

async function main() {
  await sync();
  if (dryRun) {
    console.log("【演练模式】已生成文章、索引与静态页面，未推送。");
    process.exit(0);
  }
  if (!existsSync(tokenPath)) {
    console.log("未找到发布令牌 .publish-token.txt。请让 AI 助手配置一次。");
    process.exit(1);
  }
  const status = execSync("git status --porcelain", { cwd: root, stdio: "pipe" }).toString().trim();
  if (!status) { console.log("没有变化，无需推送。"); process.exit(0); }
  try { commitAll("publish: posts update " + new Date().toISOString().slice(0, 10)); console.log("已提交本地变更。"); }
  catch (e) { console.log("git 提交提示：", String(e).slice(0, 200)); }
  let pushed = false;
  for (let i = 1; i <= 4 && !pushed; i++) {
    try { pushOnce(); pushed = true; }
    catch (e) {
      const msg = String(e);
      if (/rejected|non-fast-forward|fetch first/i.test(msg)) {
        console.log("本地与云端历史不一致，尝试自动对齐……");
        try {
          execSync("git fetch origin main", { cwd: root, stdio: "pipe" });
          execSync("git reset --hard origin/main", { cwd: root, stdio: "pipe" });
          await sync();
          commitAll("publish: posts update " + new Date().toISOString().slice(0, 10));
          pushOnce();
          pushed = true;
          console.log("自动对齐成功并已推送。");
        } catch (e2) {
          console.log("自动对齐失败（很可能是网络问题）。请稍后重试，或双击 修复对齐.bat 后再发布。");
          break;
        }
      } else {
        console.log("推送失败（第 " + i + " 次），重试……");
      }
    }
  }
  if (pushed) {
    console.log("==========================================");
    console.log("  ✅ 发布完成！刷新 https://jiyusflowers.com 即可看到。");
    console.log("==========================================");
  } else {
    console.log("推送未成功。请稍后重新运行，或把情况告诉 AI 助手。");
    process.exit(1);
  }
}
main();
