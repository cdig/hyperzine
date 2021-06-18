Take ["DOOM", "Memory", "State", "DOMContentLoaded"], (DOOM, Memory, State)->
  { exec } = require "child_process"

  meta = document.querySelector "title-bar .meta"

  State.subscribe "asset", false, (asset)-> if asset?
    size = await new Promise (resolve)->
      exec "du -sh '#{asset.path}'", (err, val)->
        resolve err or (val.split("\t")[0] + "B")

    frag = new DocumentFragment()

    elm = DOOM.create "div", frag, textContent: "ID"
    DOOM.create "span", elm, textContent: State("asset").id

    elm = DOOM.create "div", frag, textContent: "Size"
    DOOM.create "span", elm, textContent: size

    meta.replaceChildren frag
