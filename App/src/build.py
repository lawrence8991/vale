#!/usr/bin/env python3
"""Rebuild ../index.html. Run `node build-scene.mjs` first if the scene changed."""
import json
from pathlib import Path
here = Path(__file__).parent
tpl = (here / "page-template.html").read_text()
fonts = (here / "fonts.css").read_text().strip()
scene = (here / "scene.svg").read_text().strip()
meta = json.loads((here / "meta.json").read_text())
out = (tpl.replace("/*__FONTS__*/", fonts)
          .replace("<!--__SCENE__-->", scene)
          .replace("__PARK_FRAC__", str(meta["parkFrac"])))
assert "__PARK_FRAC__" not in out
head = """<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vale — Facilities &amp; energy management</title>
  <meta name="description" content="Vale keeps UK commercial buildings compliant with energy law — MEES, EPC, DEC, ESOS, SECR, TM44 — while cutting cost and carbon. Book a free site audit.">
  <link rel="icon" type="image/png" href="favicon.png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
</head>
<body id="top">
"""
body = out.split("\n", 1)[1]
(here.parent / "index.html").write_text(head + body + "\n</body>\n</html>\n")
print("built ../index.html")
