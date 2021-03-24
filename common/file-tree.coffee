fs = require "fs"
path = require "path"

Take ["Read"], (Read)->

  isFolder = (folderPath)->
    fs.existsSync(folderPath) and fs.lstatSync(folderPath).isDirectory()


  Make "FileTree", FileTree =
    build: (parentPath, name)->
      tree =
        name: name
        path: path.join parentPath, name
      if isFolder tree.path
        tree.children = Read.folder(tree.path) or []
        tree.count = tree.children.length
        for childName, i in tree.children
          tree.children[i] = FileTree.build tree.path, childName
          tree.count += tree.children[i].count or 0
      return tree

    flatNames: (tree)->
      out = [tree.name]
      if tree.children?
        for child in tree.children
          out = out.concat FileTree.flatNames child
      out
