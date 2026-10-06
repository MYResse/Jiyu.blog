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

  function renderSidebar() {
    var el = document.getElementById("site-sidebar");
    if (!el) return;
    var path = location.pathname;
    var file = path.split("/").pop() || "";
    var nav = [
      { href: "/", label: "首页", active: file === "" || file === "index.html" },
      { href: "archives", label: "归档", active: file === "archives" },
      { href: "now", label: "Now", active: file === "now" },
      { href: "about", label: "关于", active: file === "about" },
      { href: "discover", label: "发现", active: file === "discover" }
    ];
    var links = nav.map(function (n) {
      return '<a class="' + (n.active ? "active" : "") + '" href="' + n.href + '">' + n.label + "</a>";
    }).join("");
    el.innerHTML =
      '<div class="sidebar-top">' +
      '<div><a class="brand" href="/">纪遇的花</a><div class="brand-en">Jiyu\'s Flowers</div></div>' +
      '<button class="theme-btn" id="theme-btn" type="button" title="切换深色 / 浅色模式">' + (theme === "dark" ? "☀" : "☾") + "</button>" +
      "</div>" +
      '<nav class="side-nav">' + links + "</nav>" +
      '<details class="side-panel" id="profile-panel" open>' +
      '<summary><span class="section-tag"><span class="section-tag-index">04</span><span class="section-tag-label">花园主人</span></span></summary>' +
      '<div class="panel-body">' +
      '<img class="profile-avatar" src="/avatar.svg" alt="纪遇的头像">' +
      '<div class="profile-name">纪遇</div>' +
      '<div class="profile-bio">你好，我是纪遇。这里是我的花园——网站是花园，网页里的内容是花。</div>' +
      '<div class="profile-stats"><span><b id="stat-posts">—</b> 篇文章</span><span><b>2026</b> 年始</span></div>' +
      "</div></details>" +
      '<details class="side-panel" id="sparks-panel" open>' +
      '<summary><span class="section-tag"><span class="section-tag-index">03</span><span class="section-tag-label">Sparks · 随想</span></span></summary>' +
      '<div class="panel-body" id="sparks"><p class="placeholder">正在加载……</p></div>' +
      "</details>" +
      '<div class="sidebar-foot"><p>© ' + new Date().getFullYear() + ' 纪遇的花 · 开在花园里的文字</p><p><a href="https://github.com/MYResse/Jiyu.blog" target="_blank" rel="noopener">GitHub 源代码</a></p></div>';
    document.getElementById("theme-btn").addEventListener("click", function () {
      theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
      var btn = document.getElementById("theme-btn");
      if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
    });
    if (window.innerWidth <= 900) {
      var prof = document.getElementById("profile-panel");
      if (prof) prof.removeAttribute("open");
    }
  }

  function renderFooter() {
    var el = document.getElementById("site-footer");
    if (!el) return;
    el.innerHTML =
      '<div class="footer-info">' +
      "<p>「纪遇的花园」是这座网站的名字——网站是花园，网页里的内容是花。本站由 GitHub Pages 免费托管。</p>" +
      '<p><a href="archives">归档</a> · <a href="now">Now</a> · <a href="about">关于</a> · <a href="discover">发现</a></p>' +
      "</div>" +
      '<p class="footer-copy">© ' + new Date().getFullYear() + " 纪遇的花 · 开在花园里的文字</p>";
  }

  renderSidebar();
  renderFooter();
})();
