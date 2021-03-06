Take ["DOOM", "File", "State", "DOMContentLoaded"], (DOOM, File, State)->
  filesPane = document.querySelector "files-pane"
  fileList = filesPane.querySelector "file-list"

  fileElms = {}

  fileSort = (a, b)-> a.name.localeCompare b.name

  makeFileElms = (tree, frag, depth = 0)->
    search = State("search")?.toLowerCase()

    for child in tree.children.sort fileSort
      fileElm = fileElms[child.name] ?= File child, depth
      if (not search?) or (search.length <= 0) or child.name.toLowerCase().search(search) >= 0
        frag.appendChild fileElm
      if fileElm._show_children and child.children?
        makeFileElms child, frag, depth+1
    null

  Make "FilesPane", FilesPane =
    render: ()->
      frag = new DocumentFragment()
      if State "archived"
        div = DOOM.create "div", frag, class: "archived"
        DOOM.create "h2", div, textContent: "Archived"
        DOOM.create "h3", div, textContent: "To avoid confusion, the files in an archived asset are not accessible."
      else
        makeFileElms State("asset").files, frag

      fileList.replaceChildren frag
