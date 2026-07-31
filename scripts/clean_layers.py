"""
Illustrator (and similar tools) export ALL layers into the SVG, marking
hidden ones with a CSS class like `.st0{display:none}` rather than leaving
them out - so a file where you only toggled on one layer still contains
all of them. If you then feed that straight into the pipeline, whichever
layer happens to be first "wins" visually by luck, or you get everything
overlapping.

This does two things:

1. Finds the CSS rules that set display:none, finds the top-level
   <g id="...">...</g> layer groups, and keeps only the one(s) NOT hidden
   by one of those rules - discarding the rest instead of just leaving
   them inert.

2. Inlines every remaining class="stN" into a style="..." attribute and
   drops the <style> block entirely. This matters because this pipeline
   splices multiple originally-separate SVG files (trunk/background/
   ground) into ONE document - each file names its classes the same way
   (.st0, .st1, ...) for completely different things, so if the <style>
   blocks were left in, whichever one appears last in the merged document
   would silently override earlier files' classes (e.g. one file's
   ".st0 { fill: green }" getting clobbered by another's
   ".st0 { display: none }"). Inlining removes the shared namespace so
   this can't happen regardless of what any individual file's class
   scheme looks like.

Safe to run on a file that's already clean (no hidden groups, no classes)
- it just won't change anything.

Usage:
    python3 scripts/clean_layers.py <input.svg> <output.svg>
"""
import re
import sys


def parse_rules(content):
    style_match = re.search(r"<style[^>]*>(.*?)</style>", content, re.S)
    rules = {}
    if style_match:
        for cls, body in re.findall(r"\.(\w+)\s*\{([^}]*)\}", style_match.group(1)):
            rules[cls] = body.strip().rstrip(";")
    return rules, style_match


def inline_classes(content, rules):
    def replace(m):
        cls = m.group(1)
        rule = rules.get(cls)
        return f'style="{rule}"' if rule else ""

    return re.sub(r'class="(\w+)"', replace, content)


def clean_content(content):
    rules, style_match = parse_rules(content)
    hidden_classes = {cls for cls, body in rules.items() if "display:none" in body.replace(" ", "")}

    groups = list(re.finditer(r'<g id="[^"]*"(?: class="(\w+)")?>', content))
    if groups:
        tail_start = content.rfind("</svg>")
        kept_spans = []
        for i, g in enumerate(groups):
            if g.group(1) in hidden_classes:
                continue
            start = g.start()
            # find this group's matching closing </g> - our layer groups here
            # don't nest further <g id="Слой_..."> siblings inside them, so the
            # next top-level group's start (or the closing </svg>) is the boundary
            end = groups[i + 1].start() if i + 1 < len(groups) else tail_start
            kept_spans.append(content[start:end])

        if kept_spans:
            head = content[: groups[0].start()]
            tail = content[tail_start:]
            content = head + "".join(kept_spans) + tail

    # Drop the <style> block and bake every remaining class into a style
    # attribute instead, so there's no shared, collidable class namespace
    # left once this gets spliced together with other cleaned files.
    if style_match:
        content = content.replace(style_match.group(0), "")
    content = inline_classes(content, rules)

    return content


def clean(path):
    return clean_content(open(path, encoding="utf-8").read())


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: python3 scripts/clean_layers.py <input.svg> <output.svg>")
        sys.exit(1)
    result = clean(sys.argv[1])
    open(sys.argv[2], "w", encoding="utf-8").write(result)
    print(f"wrote {sys.argv[2]}")
