(function () {
  var listEl = document.getElementById("post-list");
  var filterBar = document.getElementById("filter-bar");
  if (!listEl || !filterBar) return;

  function fmtDate(d) {
    var p = String(d).split("-");
    if (p.length !== 3) return d;
    return parseInt(p[0], 10) + " 年 " + parseInt(p[1], 10) + " 月 " + parseInt(p[2], 10) + " 日";
  }

  function renderList(posts, tag) {
    var shown = !tag || tag === "*"
      ? posts
      : posts.filter(function (p) { return (p.tags || []).indexOf(tag) !== -1; });
    if (!shown.length) {
      listEl.innerHTML = '<li class="placeholder">这个分类下还没有文章。</li>';
      return;
    }
    listEl.innerHTML = shown.map(function (p) {
      var tagHtml = (p.tags || []).map(function (t) {
        return '<span class="tag-mini">' + escapeHtml(t) + "</span>";
      }).join("");
      return '<li class="post-item">' +
        '<div class="post-date">' + escapeHtml(fmtDate(p.date)) + "</div>" +
        '<h2 class="post-title"><a href="post.html?slug=' + encodeURIComponent(p.slug) + '">' + escapeHtml(p.title) + "</a></h2>" +
        '<p class="post-summary">' + escapeHtml(p.summary || "") + "</p>" +
        '<div class="post-tags">' + tagHtml + "</div>" +
        "</li>";
    }).join("");
  }

  function renderFilter(posts) {
    var tags = [];
    posts.forEach(function (p) {
      (p.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); });
    });
    var chips = ['<button class="tag active" data-tag="*">全部</button>'].concat(tags.map(function (t) {
      return '<button class="tag" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + "</button>";
    }));
    filterBar.innerHTML = chips.join("");
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("button") : null;
      if (!btn || !filterBar.contains(btn)) return;
      var tag = btn.getAttribute("data-tag");
      Array.prototype.forEach.call(filterBar.children, function (b) { b.classList.toggle("active", b === btn); });
      renderList(posts, tag);
    });
  }

  fetch("posts/index.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (posts) {
      posts.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.slug < b.slug ? -1 : 1;
      });
      renderFilter(posts);
      renderList(posts, "*");
    })
    .catch(function () {
      listEl.innerHTML = '<li class="placeholder">文章加载失败：请通过 http:// 地址访问（双击 start.bat 即可自动打开），不要直接双击 index.html。</li>';
    });
})();
