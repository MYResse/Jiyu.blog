(function () {
  var listEl = document.getElementById("post-list");
  var featEl = document.getElementById("featured-grid");
  var sparksEl = document.getElementById("sparks");
  var countEl = document.getElementById("hero-count");
  if (!listEl || !featEl || !sparksEl || !countEl) return;

  function fmtRow(d) {
    var p = String(d).split("-");
    if (p.length !== 3) return d;
    return parseInt(p[1], 10) + "月" + parseInt(p[2], 10) + "日";
  }
  function fmtCard(d) { return String(d).replace(/-/g, "."); }
  function daysAgo(d) {
    var t = new Date(String(d) + "T00:00:00");
    return Math.floor((new Date().getTime() - t.getTime()) / 86400000);
  }
  function tagsHtml(tags) {
    return (tags || []).map(function (t) {
      return '<span class="tag-mini">' + escapeHtml(t) + "</span>";
    }).join("");
  }

  var p1 = fetch("posts/index.json").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  var p2 = fetch("sparks.json").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });

  Promise.all([p1, p2])
    .then(function (res) {
      var posts = res[0].sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.slug < b.slug ? -1 : 1;
      });
      var sparks = res[1] || [];

      countEl.textContent = "共 " + posts.length + " 篇文章 · 用文字慢慢浇灌";

      // 01 精选文章
      var featured = posts.filter(function (p) { return p.featured; });
      featEl.innerHTML = featured.length
        ? featured.slice(0, 4).map(function (p) {
            return '<a class="post-card" href="/post/' + encodeURIComponent(p.slug) + '">' +
              '<div class="card-date">' + escapeHtml(fmtCard(p.date)) + "</div>" +
              '<div class="card-title">' + escapeHtml(p.title) + "</div>" +
              '<p class="card-summary">' + escapeHtml(p.summary || "") + "</p>" +
              '<div class="card-tags">' + tagsHtml(p.tags) + "</div>" +
              "</a>";
          }).join("")
        : '<p class="placeholder">还没有精选文章。</p>';

      // 02 最近更新
      listEl.innerHTML = posts.slice(0, 6).map(function (p) {
        var da = daysAgo(p.date);
        var isNew = da >= 0 && da <= 14;
        return '<li class="post-item">' +
          '<span class="post-date">' + escapeHtml(fmtRow(p.date)) + "</span>" +
          '<div class="post-info">' +
          '<p class="post-title"><a href="/post/' + encodeURIComponent(p.slug) + '">' + escapeHtml(p.title) + "</a>" +
          (isNew ? '<span class="new-badge">NEW</span>' : "") + "</p>" +
          '<p class="post-summary">' + escapeHtml(p.summary || "") + "</p>" +
          "</div></li>";
      }).join("");

      // 03 Sparks 随想
      var sorted = sparks.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      sparksEl.innerHTML = sorted.slice(0, 6).map(function (s) {
        return '<div class="spark-item">' +
          '<span class="spark-date">' + escapeHtml(fmtRow(s.date)) + "</span>" +
          '<div class="spark-text">' + escapeHtml(s.text) + "</div>" +
          "</div>";
      }).join("") || '<p class="placeholder">还没有随想。</p>';
    })
    .catch(function () {
      listEl.innerHTML = '<li class="placeholder">内容加载失败，请刷新重试。</li>';
      featEl.innerHTML = '<p class="placeholder">内容加载失败。</p>';
      sparksEl.innerHTML = '<p class="placeholder">内容加载失败。</p>';
    });
})();
