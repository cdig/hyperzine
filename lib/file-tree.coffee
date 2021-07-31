Take ["Read"], (Read)->

  sort = (a, b)-> a.name.localeCompare b.name

  populateTree = (tree)->
    if await Read.exists tree.path
      dirents = await Read.withFileTypes tree.path
      dirents.sort sort
      tree.children = await Promise.all dirents.map (dirent)->
        if dirent.isDirectory()
          childTree = FileTree.newEmpty tree.path, dirent.name
          childTree.relpath = Read.path tree.relpath, dirent.name
          await populateTree childTree
          tree.count += childTree.count
          childTree
        else
          tree.count += 1
          parts = dirent.name.split "."
          childFile =
            name: dirent.name
            basename: Array.butLast(parts).join "."
            ext: if parts.length > 1 then Array.last(parts).toLowerCase() else null
            path: Read.path tree.path, dirent.name
            relpath: Read.path tree.relpath, dirent.name
    tree

  Make "FileTree", FileTree =
    newEmpty: (parentPath, name)->
      name: name
      path: Read.path parentPath, name # absolute path on the local HD
      relpath: name # path relative to the parent of the tree root
      count: 0
      children: []

    newPopulated: (parentPath, name)->
      root = FileTree.newEmpty parentPath, name
      await populateTree root
      root

    flat: (tree, k, into = [])->
      for child in tree.children
        if not k? # collecting children
          into.push child
        else if child[k]? # collecting children's properties
          into.push child[k]
        FileTree.flat child, k, into if child.children
      into

    find: (tree, k, v)->
      return tree if tree[k] is v
      if tree.children
        for child in tree.children
          return res if res = FileTree.find child, k, v
      null
