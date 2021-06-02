Take ["Log", "Memory", "Ports", "Read", "Write"], (Log, Memory, Ports, Read, Write)->

  Ports.on "new-asset", ()->
    assetsFolder = Memory "assetsFolder"
    number = Memory "nextAssetNumber"
    creator = Memory "localName"
    id = creator + " " + number
    path = Read.path assetsFolder, id
    Write.sync.mkdir path
    return id

  permittedKeys = name: "Name", shot: "Shot"#, tags: "Tags", files: "Files"

  validName = (name)->
    return -1 is name.search /[^\w &-(),]/


  Memory.subscribe "assets", true, (assets, changes)->
    assetsFolder = Memory "assetsFolder"

    for id, oldAsset of changes
      if assets[id]
        for k of oldAsset
          if folder = permittedKeys[k]
            if (v = assets[id][k]) and validName v
              kPath = Read.path assetsFolder, id, folder
              vPath = Read.path kPath, v
              Log "kPath #{kPath}"
              Log "vPath #{vPath}"
              if Read(kPath)?
                try
                  Write.sync.rm kPath
                  Log "Write.sync.rm success"
                catch
                  Log "Write.sync.rm failed #{kPath}"
                  continue

              # We probably want some plan for raising errors about writes that fail,
              # so we can show them in the UI somewhere

              try
                Write.sync.mkdir vPath
                Log "Write.sync.mkdir success"
              catch
                Log "Write.sync.mkdir failed #{vPath}"

            else
              Log "Delete #{id} . #{folder}"
          else
            # The change was an asset property that doesn't get saved
      else
        Log "Delete #{id}"
