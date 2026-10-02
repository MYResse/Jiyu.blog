# 纪遇的花园

极简纸感风格的个人博客。设计借鉴 xiluluke（纸感与卡片微交互）、排版致敬 DemoChen（霞鹜文楷）、内容结构参考梁某银（精选 / 最近更新 / Sparks / 归档）。

在线地址：https://myresse.github.io/Jiyu.blog/

## 本地预览

双击 start.bat，浏览器会自动打开 http://127.0.0.1:8765

## 写一篇新文章

1. 在 posts 文件夹里新建 xxx.md；
2. 开头按下面的格式填写信息卡片：

    ---
    title: 文章标题
    date: 2026-10-02
    tags: [随笔]
    summary: 一句话简介
    featured: true
    ---

    正文……

3. 让 AI 助手运行 tools/build-index.mjs 重建索引并推送（或自己运行：node tools/build-index.mjs）。

最简单的方式：把草稿直接发给 AI 助手，说"帮我发布到博客"。

## 短随想（Sparks）

编辑 sparks.json，每条格式：{ "date": "2026-10-01", "text": "……" }

## 发布

GitHub Pages：main 分支根目录。购买域名与绑定请让 AI 助手指导。
