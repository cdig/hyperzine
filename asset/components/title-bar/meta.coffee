Take ["ADSR", "DOOM", "Memory", "State", "DOMContentLoaded"], (ADSR, DOOM, Memory, State)->
  { exec } = require "child_process"

  meta = document.querySelector "title-bar .meta"

  # TODO: This should be moved to a background process, perhaps DB, or perhaps somewhere else,
  # since the child_process.exec takes about 50ms to run.
  State.subscribe "asset", false, ADSR 0, 5000, (asset)-> if asset?
    size = await new Promise (resolve)->
      exec "du -sh '#{asset.path}'", (err, val)->
        resolve err or (val.split("\t")[0] + "B").replace("BB", "B")

    frag = new DocumentFragment()

    elm = DOOM.create "div", frag, textContent: "ID"
    DOOM.create "span", elm, textContent: State("asset").id

    elm = DOOM.create "div", frag, textContent: "Size"
    DOOM.create "span", elm, textContent: size

    meta.replaceChildren frag
