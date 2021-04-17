Take ["DOOM"], (DOOM)->

  src = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTIwIDUyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHJhZGlhbEdyYWRpZW50IGlkPSJhIiBjeD0iNTAlIiBjeT0iMTAwJSIgcj0iNTAlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM4ODgiIHN0b3Atb3BhY2l0eT0iLjIiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM4ODgiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PHJhZGlhbEdyYWRpZW50IGlkPSJiIiBjeD0iNTAlIiBjeT0iMCUiIHI9IjUwJSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjODg4IiBzdG9wLW9wYWNpdHk9Ii45Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjODg4IiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50PjxnIHRyYW5zZm9ybT0ibWF0cml4KDAgMSAtMSAwIDUyMCAwKSI+PHBhdGggZD0ibTI1OSA1MTljLTE0MyAwLTI1OS0xMTYtMjU5LTI2MCAwLTE0MyAxMTYtMjU5IDI1OS0yNTkgMTQ0IDAgMjYwIDExNiAyNjAgMjU5IDAgMTQ0LTExNiAyNjAtMjYwIDI2MHptMC02N2MxMDcgMCAxOTMtODYgMTkzLTE5MyAwLTEwNi04Ni0xOTMtMTkzLTE5My0xMDYgMC0xOTMgODctMTkzIDE5MyAwIDEwNyA4NyAxOTMgMTkzIDE5M3oiIGZpbGw9InVybCgjYSkiLz48cGF0aCBkPSJtMjQ3IDM4Ni0yNS01LTE4IDI4LTExLTUgNy0zMy0yMS0xNC0yOCAxOS04LTggMTgtMjgtMTQtMjEtMzIgNy01LTExIDI4LTE4LTUtMjUtMzMtNnYtMTJsMzMtNyA1LTI0LTI4LTE5IDUtMTEgMzIgNyAxNC0yMS0xOC0yNyA4LTkgMjggMTkgMjEtMTQtNy0zMyAxMS00IDE4IDI4IDI1LTUgNi0zM2gxMmw2IDMzIDI1IDUgMTgtMjggMTEgNC03IDMzIDIxIDE0IDI4LTE5IDggOS0xOCAyNyAxNCAyMSAzMi03IDUgMTEtMjggMTkgNSAyNCAzMyA3djEybC0zMyA2LTUgMjUgMjggMTgtNSAxMS0zMi03LTE0IDIxIDE4IDI4LTggOC0yOC0xOS0yMSAxNCA3IDMzLTExIDUtMTgtMjgtMjUgNS02IDMyaC0xMnoiIGZpbGw9InVybCgjYikiLz48L2c+PC9zdmc+"

  Make "GearView", (depth = 30, offset)->
    offset ?= Math.rand(.2, 1) * Math.sign Math.rand()

    gearsElm = document.querySelector "gear-view"
    gearElm = gearsElm
    for i in [0..depth]
      gearElm = DOOM.create "div", gearElm, style: "animation-delay: -#{offset}s"
      DOOM.create "img", gearElm, src: src

    gearsElm
