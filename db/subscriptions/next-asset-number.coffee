Take ["Memory"], (Memory)->

  update = ()->
    assets = Memory "assets"
    localName = Memory "localName"

    return unless localName? and assets?

    highestNumber = 0

    for assetId, asset of assets
      if asset.creator.toLowerCase() is localName.toLowerCase()
        highestNumber = Math.max highestNumber, asset.number

    Memory "nextAssetNumber", highestNumber + 1

    null

  Memory.subscribe "localName", true, update
  Memory.subscribe "assets", true, update
  update()
