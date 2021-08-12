Take ["DOOM", "FileInfo", "FileThumbnail", "Log", "DOMContentLoaded"], (DOOM, FileInfo, FileThumbnail, Log)->

  Make.async "File", File = (file)->
    elm = DOOM.create "div", null,
      class: if file.count? then "file folder" else "file"

    FileThumbnail elm, file
    FileInfo elm, file

    elm

  File.update = FileInfo.update
