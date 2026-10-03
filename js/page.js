(function () {
  var el = document.getElementById("page");
  if (!el) return;
  var params = new URLSearchParams(location.search);
  var name = (params.get("page") || "").replace(/[^a-z0-9-]/gi, "");
  if (!name) {
    el.innerHTML = '<p class="placeholder">没有指定页面。</p>';
    return;
  }
  fetch("pages/" + encodeURIComponent(name) + ".md")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    .then(function (src) {
      var out = mdToHtml(src);
      var m = out.meta;
      document.title = (m.title || name) + " · 纪遇的花园";
      el.innerHTML =
        '<a class="back-link" href="index.html">← 回到首页</a>' +
        (m.title ? "<h1>" + escapeHtml(m.title) + "</h1>" : "") +
        '<div class="post-content">' + out.html + "</div>";
    })
    .catch(function () {
      el.innerHTML = '<p class="placeholder">页面加载失败，请确认页面文件存在。</p>';
    });
})();
