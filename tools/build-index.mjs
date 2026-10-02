// 生成 posts/index.json：扫描 posts 目录下的所有 .md 文件，提取文章信息卡片（front matter）
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "posts");

const posts = [];
for (const file of readdirSync(postsDir).filter((f) => f.endsWith(".md"))) {
  const src = readFileSync(join(postsDir, file), "utf8");
  const meta = {};
  const m = src.match(/^\s*---\s*\n([\s\S]*?)\n---/);
  if (m) {
    for (const line of m[1].split(/\n/)) {
      const kv = line.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1];
      const val = kv[2].trim();
      meta[key] = key === "tags"
        ? val.replace(/[\[\]]/g, "").split(",").map((t) => t.trim()).filter(Boolean)
        : val;
    }
  }
  posts.push({
    slug: file.replace(/\.md$/, ""),
    title: meta.title || file,
    date: meta.date || "1970-01-01",
    tags: meta.tags || [],
    summary: meta.summary || "",
    featured: meta.featured === "true"
  });
}
posts.sort((a, b) => {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug < b.slug ? -1 : 1;
});
writeFileSync(join(postsDir, "index.json"), JSON.stringify(posts, null, 2) + "\n", "utf8");
console.log("index.json 已生成，共 " + posts.length + " 篇文章。");
