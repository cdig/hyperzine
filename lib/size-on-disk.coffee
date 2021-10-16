Take ["Read"], (Read)->

  Make.async "SizeOnDisk", SizeOnDisk = (path)->
    new Promise (resolve)->
      stats = await Read.stat path
      if not stats?
        resolve 0
      else if not stats.isDirectory()
        resolve stats.size
      else
        total = 0
        children = await Read.async path
        sizes = for childName in children
          SizeOnDisk Read.path path, childName
        for size in sizes
          total += await size
        resolve total

  SizeOnDisk.pretty = (path)->
    size = await SizeOnDisk path
    len = size.toString().length

    switch
      when len < 3
        suffix = "B"
        exp = 0
      when len < 7
        suffix = "KB"
        exp = 1
      when len < 11
        suffix = "MB"
        exp = 2
      else
        suffix = "GB"
        exp = 3

    (size / Math.pow(1000, exp)).toFixed(1) + " " + suffix
