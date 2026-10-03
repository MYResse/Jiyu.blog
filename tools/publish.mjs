// 一键发布脚本 v2：把 Obsidian"发布文件夹"里的文章/页面同步到博客并推送到 GitHub
// 用法：双击 一键发布.bat（或运行 node tools/publish.mjs）
// 规则：普通文件 → 文章（posts/）；page- 开头的文件 → 独立页面（pages/）；_ 开头的文件忽略
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "posts");
const pagesDir = join(root, "pages");
const configPath = join(root, "publish-config.json");
const tokenPath = join(root, ".publish-token.txt");
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
  console.log("【首次使用】请先配置 Obsidian 发布文件夹：");
  console.log("  编辑 " + configPath + "，把 sourceDir 改成发布文件夹路径，例如：");
  console.log('  { "sourceDir": "E:/Obsidian/信息流/写作库/发布" }');
  console.log("");
  console.log("（也可以直接让 AI 助手帮你配置。）");
  process.exit(0);
}

function parseMeta(src) {
  const meta = { title: "", slug: "", date: "", tags: [], summary: "", featured: false };
  const m = src.match(/^\s*---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!m) return meta;
  const lines = m[1].split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^\s*([\w-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim().replace(/^["']|["']$/g, "");
    if (key === "tags") {
      if (val.startsWith("[")) {
        meta.tags = val.replace(/[\[\]]/g, "").split(",").map((t) => t.trim()).filter(Boolean);
      } else if (val === "") {
        const list = [];
        while (i + 1 < lines.length && /^\s+-\s+.+/.test(lines[i + 1])) {
          list.push(lines[i + 1].replace(/^\s+-\s+/, "").trim());
          i++;
        }
        meta.tags = list;
      } else {
        meta.tags = val.split(/\s+/).filter(Boolean);
      }
    } else if (key === "title") { meta.title = val; }
    else if (key === "slug") { meta.slug = val; }
    else if (key === "date") { meta.date = val; }
    else if (key === "summary") { meta.summary = val; }
    else if (key === "featured") { meta.featured = val === "true" || val === "yes"; }
  }
  return meta;
}

function safeSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function shortHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h.toString(36).slice(0, 4);
}

const files = readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith(".md") && !f.startsWith("_"));
if (!files.length) {
  console.log("");
  console.log("发布文件夹里还没有文章（将只检查是否有待推送的变更）。");
}
if (!existsSync(pagesDir)) mkdirSync(pagesDir, { recursive: true });

let postCount = 0, pageCount = 0;
for (const f of files) {
  const src = readFileSync(join(sourceDir, f), "utf8");
  const meta = parseMeta(src);
  const stat = statSync(join(sourceDir, f));
  const isPage = f.startsWith("page-");
  const title = meta.title || basename(f, ".md");
  const date = meta.date || stat.mtime.toISOString().slice(0, 10);
  const body = src.replace(/^\s*---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "").trim();
  const tags = meta.tags.length ? meta.tags : (isPage ? [] : ["随笔"]);
  const firstLine = body.split("\n").filter((l) => l.trim() && !l.startsWith("#"))[0] || "";
  const summary = meta.summary || firstLine.slice(0, 60);
  const fm = ["---", "title: " + title, "date: " + date];
  if (tags.length) fm.push("tags: [" + tags.join(", ") + "]");
  fm.push("summary: " + summary.replace(/\n/g, " "));
  if (meta.featured) fm.push("featured: true");
  fm.push("---", "", body);

  let target;
  if (isPage) {
    target = join(pagesDir, f.replace(/^page-/, ""));
    pageCount++;
  } else {
    let slug = safeSlug(meta.slug || "");
    if (!slug) {
      const base = basename(f, ".md");
      slug = /^[a-z0-9-]+$/i.test(base) ? base : "post-" + date + "-" + shortHash(f);
    }
    target = join(postsDir, slug + ".md");
    postCount++;
  }
  writeFileSync(target, fm.join("\n") + "\n", "utf8");
  console.log("✓ " + f + "  →  " + (isPage ? "pages/" + basename(target) : "posts/" + basename(target)) + "  [" + title + "]");
}
console.log("共处理 " + postCount + " 篇文章、" + pageCount + " 个页面。");

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
