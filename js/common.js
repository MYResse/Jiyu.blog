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
    var nav = [
      { href: "index.html", label: "首页", active: file === "index.html" || file === "" },
      { href: "about.html", label: "关于", active: file === "about.html" }
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
    el.innerHTML = "<p>© " + new Date().getFullYear() + " 纪遇的花园 · 用文字浇灌生活</p>";
  }

  renderHeader();
  renderFooter();
})();
