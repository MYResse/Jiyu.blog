# 纪遇的花园

纸感极简的个人博客（设计借鉴 xiluluke、排版致敬 DemoChen、结构参考梁某银）。
在线地址：https://jiyusflowers.com

## 日常发布（推荐方式）

1. 在 Obsidian 里写作，把要发布的文章放进「发布」文件夹（E:\Obsidian\信息流\写作库\发布）；
2. 双击本目录下的 一键发布.bat；
3. 完成！脚本会自动：整理格式 → 重建索引 → 提交 → 推送，刷新网站即可看到。

## 文件命名规则

- 普通文章：任意文件名（建议英文，会成为网址的一部分）；标题、日期、标签等写在文件开头的信息卡片里（模板见发布文件夹里的 _发布模板.md）；
- 页面：文件名以 page- 开头，例如 page-now.md → 网站 Now 页面，page-about.md → 关于页；
- 下划线开头的文件（如 _发布模板.md）不会被发布。

## 目录结构

- index.html / post.html / page.html / archives.html —— 页面模板
- css/ js/ —— 样式与脚本
- posts/ —— 文章（.md）
- pages/ —— 独立页面（now/about/discover 等 .md）
- sparks.json —— 首页「Sparks 随想」
- tools/publish.mjs —— 一键发布脚本
- 一键发布.bat —— 双击发布
- publish-config.json —— 本地配置（不上传 GitHub）
- .publish-token.txt —— 发布令牌（不上传 GitHub）

## 本地预览

双击 start.bat，浏览器自动打开 http://127.0.0.1:8765

## 技术支持

需要改样式、加功能、处理域名问题时，把需求发给 AI 助手即可。
