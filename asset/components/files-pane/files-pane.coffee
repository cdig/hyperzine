Take ["DOOM", "File", "State", "DOMContentLoaded"], (DOOM, File, State)->
  filesPane = document.querySelector "files-pane"
  fileList = filesPane.querySelector "file-list"

  fileElms = {}

  makeFileElms = (asset, tree, parentFrag, depth = 0)->
    search = State("search")?.toLowerCase()

    frag = DOOM.create "div"
    for child in tree.children
      fileElm = fileElms[child.relpath] ?= File child, depth
      File.update asset, child, fileElm
      # if (not search?) or (search.length <= 0) or child.name.toLowerCase().search(search) >= 0
      frag.appendChild fileElm
      if child.children? and DOOM(fileElm, "showChildren")?
        makeFileElms asset, child, frag, depth+1
    parentFrag.appendChild frag
    null

  Make "FilesPane", FilesPane =
    render: ()->
      return unless asset = State "asset"

      frag = new DocumentFragment()

      if State "archived"
        div = DOOM.create "div", frag, class: "archived"
        DOOM.create "h2", div, textContent: "Archived"
        DOOM.create "h3", div, textContent: "To avoid confusion, the files in an archived asset are not accessible."
      else
        makeFileElms asset, asset.files, frag

      fileList.replaceChildren frag
