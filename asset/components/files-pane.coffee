Take ["DOOM", "State", "DOMContentLoaded"], (DOOM, State)->

  filesPane = document.querySelector "files-pane"
  filesToolbar = filesPane.querySelector "files-toolbar"
  fileCount = filesToolbar.querySelector "[file-count]"
  fileList = filesPane.querySelector "files-list"

  fileElms = {}

  makeFileElm = (file)->
    elm = DOOM.create "div",


  Make "FilesPane", FilesPane =
    render: ()->

      for file in State.asset.files
        fileElm = fileElms[file] ?= makeFileElm file
