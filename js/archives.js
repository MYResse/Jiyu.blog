(function () {
  var el = document.getElementById("archive");
  if (!el) return;

  fetch("posts/index.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (posts) {
      posts.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.slug < b.slug ? -1 : 1;
      });

      var tagCount = {};
      posts.forEach(function (p) {
        (p.tags || []).forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; });
      });
      var cloud = Object.keys(tagCount).map(function (t) {
        return '<button class="tag-chip" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) +
          '<span class="cnt">' + tagCount[t] + "</span></button>";
      }).join("");

      var byYear = {};
      posts.forEach(function (p) {
        var y = String(p.date).slice(0, 4);
        (byYear[y] = byYear[y] || []).push(p);
      });

      var html = '<div class="tag-cloud" id="tag-cloud">' + cloud + "</div>";
      var years = Object.keys(byYear).sort(function (a, b) { return a < b ? 1 : -1; });
      years.forEach(function (y) {
        html += '<div class="archive-year"><span class="year">' + y + '</span><span class="count">' + byYear[y].length + " 篇</span></div>";
        html += '<ul class="post-list">' + byYear[y].map(function (p) {
          return '<li class="post-item" data-tags="' + escapeHtml((p.tags || []).join(",")) + '">' +
            '<span class="post-date">' + escapeHtml(String(p.date).slice(5)) + "</span>" +
            '<div class="post-info">' +
            '<p class="post-title"><a href="post.html?slug=' + encodeURIComponent(p.slug) + '">' + escapeHtml(p.title) + "</a></p>" +
            "</div></li>";
        }).join("") + "</ul>";
      });
      el.innerHTML = html;

      var activeTag = null;
      var cloudEl = document.getElementById("tag-cloud");
      cloudEl.addEventListener("click", function (e) {
        var btn = e.target.closest ? e.target.closest("button") : null;
        if (!btn || !cloudEl.contains(btn)) return;
        var tag = btn.getAttribute("data-tag");
        if (activeTag === tag) {
          activeTag = null;
          btn.classList.remove("active");
        } else {
          activeTag = tag;
          Array.prototype.forEach.call(cloudEl.querySelectorAll(".tag-chip"), function (b) { b.classList.toggle("active", b === btn); });
        }
        Array.prototype.forEach.call(el.querySelectorAll(".post-item"), function (li) {
          var tags = li.getAttribute("data-tags") || "";
          li.style.display = (!activeTag || tags.split(",").indexOf(activeTag) !== -1) ? "" : "none";
        });
      });
    })
    .catch(function () {
      el.innerHTML = '<p class="placeholder">归档加载失败，请刷新重试。</p>';
    });
})();
