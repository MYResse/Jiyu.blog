(function () {
  var THEME_KEY = "blog-theme";
  var theme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", theme);

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  window.escapeHtml = escapeHtml;

  function renderHeader() {
    var el = document.getElementById("site-header");
    if (!el) return;
    var file = location.pathname.split("/").pop() || "index.html";
    var pageParam = new URLSearchParams(location.search).get("page") || "";
    var nav = [
      { href: "index.html", label: "首页", active: file === "index.html" || file === "" },
      { href: "index.html#featured", label: "精选", active: false },
      { href: "archives.html", label: "归档", active: file === "archives.html" },
      { href: "page.html?page=now", label: "Now", active: file === "page.html" && pageParam === "now" },
      { href: "page.html?page=about", label: "关于", active: file === "page.html" && pageParam === "about" }
    ];
    var links = nav.map(function (n) {
      return '<a class="' + (n.active ? "active" : "") + '" href="' + n.href + '">' + n.label + "</a>";
    }).join("");
    el.innerHTML =
      '<a class="brand" href="index.html">纪遇的花园</a>' +
      '<div class="nav">' + links +
      '<button class="theme-btn" id="theme-btn" type="button" title="切换深色 / 浅色模式">' +
      (theme === "dark" ? "☀" : "☾") + "</button></div>";
    document.getElementById("theme-btn").addEventListener("click", function () {
      theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
      renderHeader();
    });
  }

  function renderFooter() {
    var el = document.getElementById("site-footer");
    if (!el) return;
    el.innerHTML =
      '<div class="footer-info">' +
      "<p>本站由 GitHub Pages 免费托管 · 设计借鉴 xiluluke 的纸感与卡片，排版致敬 DemoChen 的霞鹜文楷，结构参考梁某银的精选与 Sparks。</p>" +
      '<p><a href="archives.html">归档</a> · <a href="page.html?page=now">Now</a> · <a href="page.html?page=about">关于</a> · <a href="page.html?page=discover">发现</a> · <a href="https://github.com/MYResse/Jiyu.blog" target="_blank" rel="noopener">源代码</a></p>' +
      "</div>" +
      '<p class="footer-copy">© ' + new Date().getFullYear() + " 纪遇的花园 · 用文字浇灌生活</p>";
  }

  renderHeader();
  renderFooter();
})();
