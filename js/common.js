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

  function renderTopbar() {
    var el = document.getElementById("site-topbar");
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
      '<div class="topbar-inner">' +
      '<div class="tb-brand"><a class="brand" href="/">纪遇的花</a><div class="brand-en">Jiyu\'s Flowers</div></div>' +
      '<nav class="tb-nav">' + links + "</nav>" +
      '<div class="tb-right">' +
      '<button class="theme-btn" id="theme-btn" type="button" title="切换深色 / 浅色模式">' + (theme === "dark" ? "☀" : "☾") + "</button>" +
      '<div class="tb-profile">' +
      '<img class="profile-avatar" src="/avatar.svg" alt="纪遇的头像">' +
      '<div class="tb-profile-text"><div class="profile-name">纪遇</div><div class="profile-bio">网站是花园，网页里的内容是花</div></div>' +
      "</div></div></div>";
    document.getElementById("theme-btn").addEventListener("click", function () {
      theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
      var btn = document.getElementById("theme-btn");
      if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
    });
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

  renderTopbar();
  renderFooter();
})();
