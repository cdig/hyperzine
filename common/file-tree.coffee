Take ["Read"], (Read)->

  Make "FileTree", FileTree =
    build: (parentPath, name)->
      tree =
        name: name
        path: Read.path parentPath, name
        count: 0
      dirents = await Read.withFileTypes tree.path
      tree.children = await Promise.all dirents.map filetreedirentmap = (dirent)->
        if dirent.isDirectory()
          child = await FileTree.build tree.path, dirent.name
          tree.count += child.count if child.count?
          child
        else
          tree.count += 1
          child =
            name: dirent.name
            path: Read.path tree.path, dirent.name
      return tree

    flatNames: (tree, into = [])->
      for child in tree.children
        into.push child.name
        FileTree.flatNames child, into if child.children
      into
