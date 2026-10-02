# 纪遇的花园

一个极简黑白风格的个人博客。完全静态、没有数据库，放在任何免费的静态托管服务上都能运行。

## 目录结构

- index.html —— 首页（文章列表 + 标签筛选）
- post.html —— 文章页面
- about.html —— 关于页
- css/style.css —— 全站样式（含深色模式）
- js/common.js —— 顶部导航、页脚、深浅色切换
- js/app.js —— 首页文章列表
- js/post.js —— 文章页加载与渲染
- js/markdown.js —— 迷你 Markdown 渲染器
- posts/ —— 所有文章（.md 文件）
- posts/index.json —— 文章索引（由脚本自动生成，不用手改）
- tools/build-index.mjs —— 生成文章索引的脚本
- start.bat —— 双击即可本地预览

## 本地预览

双击 start.bat，浏览器会自动打开 http://127.0.0.1:8765

注意：请通过上面的网址访问，不要直接双击 index.html（那样文章会加载不出来）。

## 写一篇新文章

1. 在 posts 文件夹里新建一个 xxx.md 文件；
2. 文件开头按下面的格式填写信息：

```
---
title: 文章标题
date: 2026-10-02
tags: [随笔]
summary: 一句话简介
---

正文……
```

3. 请 AI 助手运行 tools/build-index.mjs 生成索引（或在博客目录下运行 node tools/build-index.mjs）；
4. 刷新首页，就能看到新文章了。

最简单的方式：把草稿直接发给 AI 助手，说"帮我发布到博客"。

## 发布到互联网

本地预览只有你自己的电脑能看。想让别人也能访问，可以用这些免费服务：

- GitHub Pages
- Vercel
- Netlify

它们都需要注册账号，可以让 AI 助手带你一步步完成。
