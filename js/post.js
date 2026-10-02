(function () {
  var el = document.getElementById("post");
  if (!el) return;

  var params = new URLSearchParams(location.search);
  var slug = params.get("slug") || "";

  if (!slug) {
    el.innerHTML = '<p class="placeholder">没有指定文章。</p>';
    return;
  }

  var p1 = fetch("posts/" + encodeURIComponent(slug) + ".md").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });
  var p2 = fetch("posts/index.json").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });

  Promise.all([p1, p2])
    .then(function (res) {
      var src = res[0];
      var index = res[1].slice().sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.slug < b.slug ? -1 : 1;
      });
      var out = mdToHtml(src);
      var m = out.meta;
      document.title = (m.title || "文章") + " · 纪遇的花园";

      var plain = out.html.replace(/<[^>]+>/g, "");
      var chars = plain.length;
      var minutes = Math.max(1, Math.round(chars / 400));

      var tagHtml = (m.tags || []).map(function (t) {
        return '<span class="tag-mini">' + escapeHtml(t) + "</span>";
      }).join("");

      var i = -1;
      for (var k = 0; k < index.length; k++) { if (index[k].slug === slug) { i = k; break; } }
      var prev = i > 0 ? index[i - 1] : null;
      var next = i >= 0 && i < index.length - 1 ? index[i + 1] : null;
      var navHtml = "";
      if (prev || next) {
        navHtml = '<div class="post-nav">' +
          (prev
            ? '<a class="prev" href="post.html?slug=' + encodeURIComponent(prev.slug) + '"><span class="dir">← 上一篇</span>' + escapeHtml(prev.title) + "</a>"
            : "<span></span>") +
          (next
            ? '<a class="next" href="post.html?slug=' + encodeURIComponent(next.slug) + '"><span class="dir">下一篇 →</span>' + escapeHtml(next.title) + "</a>"
            : "<span></span>") +
          "</div>";
      }

      el.innerHTML =
        '<a class="back-link" href="index.html">← 回到首页</a>' +
        "<h1>" + escapeHtml(m.title || "未命名文章") + "</h1>" +
        '<div class="post-meta">' +
        "<span>" + escapeHtml(m.date || "") + "</span>" +
        "<span>·</span>" +
        "<span>全文约 " + chars + " 字 · 读完约 " + minutes + " 分钟</span>" +
        (tagHtml ? '<span class="post-tags">' + tagHtml + "</span>" : "") +
        "</div>" +
        '<div class="post-content">' + out.html + "</div>" +
        navHtml +
        '<a class="back-link bottom" href="index.html">← 回到首页</a>';
    })
    .catch(function () {
      el.innerHTML = '<p class="placeholder">文章加载失败：请确认是通过 http:// 地址访问的，并且文章文件存在。</p>';
    });
})();
