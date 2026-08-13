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
  <title>Vale Energies — Energy consultancy for commercial facilities</title>
  <meta name="description" content="Vale Energies keeps UK commercial buildings compliant with energy law — MEES, EPC, DEC, ESOS, SECR, TM44 — while cutting cost and carbon. Book a free site audit.">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='14' y='14' width='72' height='72' rx='16' fill='%23203B14'/%3E%3Crect x='40' y='40' width='20' height='20' rx='4' fill='%2363B04B'/%3E%3C/svg%3E">
</head>
<body id="top">
"""
body = out.split("\n", 1)[1]
(here.parent / "index.html").write_text(head + body + "\n</body>\n</html>\n")
print("built ../index.html")
