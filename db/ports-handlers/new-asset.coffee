Take ["Log", "Memory", "Ports", "Read", "Write"], (Log, Memory, Ports, Read, Write)->

  Ports.on "new-asset", ()->
    assetsFolder = Memory "assetsFolder"
    number = Memory "nextAssetNumber"
    creator = Memory "localName"
    id = creator + " " + number
    path = Read.path assetsFolder, id
    Write.sync.mkdir path
    return id
