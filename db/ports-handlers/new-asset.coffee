Take ["IPC", "Log", "Memory", "Ports", "Read", "Write"], (IPC, Log, Memory, Ports, Read, Write)->

  Ports.on "new-asset", ()->
    assetsFolder = Memory "assetsFolder"
    number = Memory "nextAssetNumber"
    creator = Memory "localName"
    id = creator + " " + number
    path = Read.path assetsFolder, id
    Write.sync.mkdir path
    IPC.send "open-asset", id
    return id
