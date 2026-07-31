// Same logic as scripts/clean_layers.py, ported to JS so it runs
// automatically on every optional asset decor.js loads - whether or not
// you remembered to run the Python script on it first. See that file's
// docstring for why this matters: files exported from the same
// multi-layer source reuse class names like .st0 for different things,
// and splicing their <style> blocks together lets the last one silently
// override an earlier file's colors/visibility.
export function stripHiddenLayersAndInlineClasses(content) {
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const rules = {};
  if (styleMatch) {
    const ruleRe = /\.(\w+)\s*\{([^}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(styleMatch[1]))) {
      rules[m[1]] = m[2].trim().replace(/;$/, "");
    }
  }
  const hidden = new Set(
    Object.entries(rules)
      .filter(([, body]) => body.replace(/\s/g, "").includes("display:none"))
      .map(([cls]) => cls)
  );

  const groupRe = /<g id="[^"]*"(?: class="(\w+)")?>/g;
  const groups = [...content.matchAll(groupRe)];
  if (groups.length) {
    const tailStart = content.lastIndexOf("</svg>");
    const kept = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (hidden.has(g[1])) continue;
      const start = g.index;
      const end = i + 1 < groups.length ? groups[i + 1].index : tailStart;
      kept.push(content.slice(start, end));
    }
    if (kept.length) {
      const head = content.slice(0, groups[0].index);
      const tail = content.slice(tailStart);
      content = head + kept.join("") + tail;
    }
  }

  if (styleMatch) content = content.replace(styleMatch[0], "");
  content = content.replace(/class="(\w+)"/g, (full, cls) => (rules[cls] ? `style="${rules[cls]}"` : ""));

  return content;
}
