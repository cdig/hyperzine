Take ["Read"], (Read)->

  build = (parentPath, name)->
    tree = FileTree.new parentPath, name
    dirents = await Read.withFileTypes tree.path
    tree.children = await Promise.all dirents.map filetreedirentmap = (dirent)->
      if dirent.isDirectory()
        child = await build tree.path, dirent.name
        tree.count += child.count if child.count?
        child
      else
        tree.count += 1
        child =
          name: dirent.name
          path: Read.path tree.path, dirent.name
    return tree

  Make "FileTree", FileTree =
    new: (parentPath, name)->
      name: name
      ext: Array.last name.split "."
      path: Read.path parentPath, name
      count: 0
      children: []

    build: (parentPath, name)->
      if await Read.exists Read.path parentPath, name
        build parentPath, name
      else
        FileTree.new parentPath, name

    flatNames: (tree, into = [])->
      for child in tree.children
        into.push child.name
        FileTree.flatNames child, into if child.children
      into
