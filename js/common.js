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
    var path = location.pathname;
    var file = path.split("/").pop() || "";
    var nav = [
      { href: "/", label: "首页", active: file === "" || file === "index.html" },
      { href: "archives", label: "归档", active: file === "archives" },
      { href: "now", label: "Now", active: file === "now" },
      { href: "about", label: "关于", active: file === "about" }
    ];
    var links = nav.map(function (n) {
      return '<a class="' + (n.active ? "active" : "") + '" href="' + n.href + '">' + n.label + "</a>";
    }).join("");
    el.innerHTML =
      '<a class="brand" href="/">纪遇的花</a>' +
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
      "<p>「纪遇的花园」是这座网站的名字——网站是花园，网页里的内容是花。本站由 GitHub Pages 免费托管。</p>" +
      '<p><a href="archives">归档</a> · <a href="now">Now</a> · <a href="about">关于</a> · <a href="discover">发现</a> · <a href="https://github.com/MYResse/Jiyu.blog" target="_blank" rel="noopener">源代码</a></p>' +
      "</div>" +
      '<p class="footer-copy">© ' + new Date().getFullYear() + " 纪遇的花 · 开在花园里的文字</p>";
  }

  renderHeader();
  renderFooter();
})();
