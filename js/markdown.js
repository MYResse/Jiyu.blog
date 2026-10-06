(function (global) {
  function parseFrontMatter(src) {
    var meta = {};
    var body = src.replace(/^\uFEFF/, "");
    var m = body.match(/^\s*---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    if (m) {
      body = body.slice(m[0].length);
      m[1].split(/\n/).forEach(function (line) {
        var kv = line.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
        if (!kv) return;
        var key = kv[1];
        var val = kv[2].trim();
        if (key === "tags") {
          meta.tags = val.replace(/[\[\]]/g, "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
        } else if (key === "date") {
          meta.date = val;
        } else {
          meta[key] = val;
        }
      });
    }
    return { meta: meta, body: body };
  }

  function inline(text) {
    var t = escapeHtml(text);
    t = t.replace(/\`([^\`\n]+)\`/g, "<code>$1</code>");
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (match, alt, src) {
    var a = (alt || "").trim().toLowerCase();
    var cls = "";
    if (a === "left" || a === "wrap-left" || a === "l") cls = ' class="img-left"';
    else if (a === "right" || a === "wrap-right" || a === "r") cls = ' class="img-right"';
    return '<img src="' + src + '" alt="' + escapeHtml(a) + '"' + cls + '>';
  });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    return t;
  }

  function mdToHtml(src) {
    var parsed = parseFrontMatter(src);
    var lines = parsed.body.replace(/\r\n?/g, "\n").split("\n");
    var html = [];
    var listType = null;
    var quoteLines = [];
    var codeBuf = null;

    function closeList() {
      if (listType) { html.push("</" + listType + ">"); listType = null; }
    }
    function closeQuote() {
      if (quoteLines.length) {
        html.push("<blockquote>" + mdToHtml(quoteLines.join("\n")).html + "</blockquote>");
        quoteLines = [];
      }
    }
    function isBlockStart(line) {
      return /^(#{1,6}\s|>\s?|\`\`\`|[-*+]\s|\d+[.)]\s|-{3,}$)/.test(line);
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (codeBuf !== null) {
        if (/^\`\`\`/.test(trimmed)) {
          var langAttr = codeBuf.lang ? ' class="language-' + codeBuf.lang + '"' : "";
          html.push("<pre><code" + langAttr + ">" + escapeHtml(codeBuf.lines.join("\n")) + "</code></pre>");
          codeBuf = null;
        } else {
          codeBuf.lines.push(line);
        }
        continue;
      }

      if (/^\`\`\`/.test(trimmed)) {
        closeList(); closeQuote();
        codeBuf = { lang: trimmed.slice(3).trim(), lines: [] };
        continue;
      }
      if (trimmed === "") { closeList(); closeQuote(); continue; }
      if (/^(-{3,}|\*{3,})$/.test(trimmed)) { closeList(); closeQuote(); html.push("<hr>"); continue; }

      var h = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeList(); closeQuote();
        var lv = h[1].length;
        html.push("<h" + lv + ">" + inline(h[2]) + "</h" + lv + ">");
        continue;
      }
      if (/^>\s?/.test(trimmed)) { closeList(); quoteLines.push(trimmed.replace(/^>\s?/, "")); continue; }
      if (/^[-*+]\s+/.test(trimmed)) {
        closeQuote();
        if (listType !== "ul") { closeList(); html.push("<ul>"); listType = "ul"; }
        html.push("<li>" + inline(trimmed.replace(/^[-*+]\s+/, "")) + "</li>");
        continue;
      }
      if (/^\d+[.)]\s+/.test(trimmed)) {
        closeQuote();
        if (listType !== "ol") { closeList(); html.push("<ol>"); listType = "ol"; }
        html.push("<li>" + inline(trimmed.replace(/^\d+[.)]\s+/, "")) + "</li>");
        continue;
      }

      closeList(); closeQuote();
      var buf = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() !== "" && !isBlockStart(lines[i + 1].trim())) {
        buf.push(lines[i + 1]);
        i++;
      }
      html.push("<p>" + inline(buf.join(" ")) + "</p>");
    }

    closeList(); closeQuote();
    if (codeBuf !== null) {
      html.push("<pre><code>" + escapeHtml(codeBuf.lines.join("\n")) + "</code></pre>");
    }
    return { meta: parsed.meta, html: html.join("\n") };
  }

  global.parseFrontMatter = parseFrontMatter;
  global.mdToHtml = mdToHtml;
})(window);
