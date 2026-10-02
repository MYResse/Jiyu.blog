(function () {
  var el = document.getElementById("post");
  if (!el) return;

  var params = new URLSearchParams(location.search);
  var slug = params.get("slug") || "";

  if (!slug) {
    el.innerHTML = '<p class="placeholder">没有指定文章。</p>';
    return;
  }

  fetch("posts/" + encodeURIComponent(slug) + ".md")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    .then(function (src) {
      var out = mdToHtml(src);
      var m = out.meta;
      document.title = (m.title || "文章") + " · 纪遇的花园";
      var tagHtml = (m.tags || []).map(function (t) {
        return '<span class="tag-mini">' + escapeHtml(t) + "</span>";
      }).join("");
      el.innerHTML =
        '<a class="back-link" href="index.html">← 回到首页</a>' +
        "<h1>" + escapeHtml(m.title || "未命名文章") + "</h1>" +
        '<div class="post-meta">' +
        "<span>" + escapeHtml(m.date || "") + "</span>" +
        (tagHtml ? '<span class="post-tags">' + tagHtml + "</span>" : "") +
        "</div>" +
        '<div class="post-content">' + out.html + "</div>" +
        '<a class="back-link bottom" href="index.html">← 回到首页</a>';
    })
    .catch(function () {
      el.innerHTML = '<p class="placeholder">文章加载失败：请确认是通过 http:// 地址访问的，并且文章文件存在。</p>';
    });
})();
