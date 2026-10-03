// 一键发布脚本 v3：把 Obsidian 写作库整库同步到博客并推送到 GitHub
// 规则：
//   普通 .md → 文章（posts/）；page- 开头 → 独立页面（pages/）；_ 开头 → 忽略
//   published: false → 跳过该文件
//   [[笔记链接]] → 自动转网页链接；目标不存在则显示为纯文字；图片嵌入显示占位
//   网址(slug)：文件属性 slug > 记忆表 slugs.json > 英文文件名 > 自动翻译 > 日期哈希
//   标题改动：网页标题自动更新；网址由 slugs.json 记住，保持不变
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "posts");
const pagesDir = join(root, "pages");
const configPath = join(root, "publish-config.json");
const tokenPath = join(root, ".publish-token.txt");
const slugsPath = join(root, "slugs.json");
const dryRun = process.argv.includes("--dry-run");

console.log("==========================================");
console.log("  纪遇的花园 · 一键发布");
console.log("==========================================");

let config = { github: { owner: "MYResse", repo: "Jiyu.blog" } };
if (existsSync(configPath)) {
  try { config = Object.assign(config, JSON.parse(readFileSync(configPath, "utf8"))); } catch (e) {}
}
const sourceDir = String(config.sourceDir || "").replace(/\\/g, "/");
if (!sourceDir || !existsSync(sourceDir)) {
  console.log("");
  console.log("【首次使用】请先配置 Obsidian 写作库路径：");
  console.log("  编辑 " + configPath + "，把 sourceDir 改成写作库路径，例如：");
  console.log('  { "sourceDir": "E:/Obsidian/信息流/写作库" }');
  console.log("");
  console.log("（也可以直接让 AI 助手帮你配置。）");
  process.exit(0);
}

let slugsCache = {};
if (existsSync(slugsPath)) {
  try { slugsCache = JSON.parse(readFileSync(slugsPath, "utf8")); } catch (e) {}
}

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

// 第一遍：读取全部文件，决定每篇的 slug
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
if (!dryRun) writeFileSync(slugsPath, JSON.stringify(slugsCache, null, 2) + "\n", "utf8");

// wikilink 目标索引（只包含会发布的文件）
const nameIndex = {};
for (const f of Object.keys(slugMap)) nameIndex[basename(f, ".md").toLowerCase()] = slugMap[f];
function convertWikilinks(body) {
  return body.replace(/!?\[\[([^\]|#\n]+)(?:#[^\]|\n]+)?(?:\|([^\]\n]+))?\]\]/g, function (match, target, alias) {
    const seg = String(target).trim().split("/").pop().trim();
    const key = seg.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(nameIndex, key)) {
      const text = alias ? String(alias).trim() : seg;
      return "[" + text + "](post.html?slug=" + encodeURIComponent(nameIndex[key]) + ")";
    }
    if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(key)) return "（图片：" + seg + "）";
    return alias ? String(alias).trim() : seg;
  });
}

// 第二遍：规范化并写入
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

// 重建文章索引
function buildIndex() {
  const posts = [];
  for (const f of readdirSync(postsDir).filter((x) => x.endsWith(".md"))) {
    const src = readFileSync(join(postsDir, f), "utf8");
    const meta = parseMeta(src);
    posts.push({
      slug: f.replace(/\.md$/, ""),
      title: meta.title || f,
      date: meta.date || "1970-01-01",
      tags: meta.tags || [],
      summary: meta.summary || "",
      featured: meta.featured === true
    });
  }
  posts.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.slug < b.slug ? -1 : 1));
  writeFileSync(join(postsDir, "index.json"), JSON.stringify(posts, null, 2) + "\n", "utf8");
  console.log("文章索引已重建（共 " + posts.length + " 篇）。");
}
buildIndex();

if (dryRun) {
  console.log("【演练模式】已生成文章与索引，未提交推送。");
  process.exit(0);
}
const token = existsSync(tokenPath) ? readFileSync(tokenPath, "utf8").trim() : "";
if (!token) {
  console.log("未找到发布令牌 .publish-token.txt。请让 AI 助手配置一次。");
  process.exit(1);
}
const status = execSync("git status --porcelain", { cwd: root, stdio: "pipe" }).toString().trim();
if (!status) {
  console.log("没有变化，无需推送。");
  process.exit(0);
}
try {
  execSync("git add -A", { cwd: root, stdio: "pipe" });
  execSync('git commit -m "publish: posts update ' + new Date().toISOString().slice(0, 10) + '" --allow-empty', { cwd: root, stdio: "pipe" });
  console.log("已提交本地变更。");
} catch (e) {
  console.log("git 提交提示：", String(e).slice(0, 200));
}
const owner = config.github.owner;
const basic = Buffer.from(owner + ":" + token).toString("base64");
let pushed = false;
for (let i = 1; i <= 4 && !pushed; i++) {
  try {
    execSync('git -c http.extraheader="AUTHORIZATION: basic ' + basic + '" push origin main', { cwd: root, stdio: "pipe" });
    pushed = true;
  } catch (e) {
    console.log("推送失败（第 " + i + " 次），重试……");
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
