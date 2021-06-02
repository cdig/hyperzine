Take ["Memory"], (Memory)->

  update = ()->
    assets = Memory "assets"
    localName = Memory "localName"

    return unless localName? and assets?

    highestNumber = 0

    for assetId, asset of assets when asset.creator is localName
      highestNumber = Math.max highestNumber, asset.number

    Memory.change "nextAssetNumber", highestNumber + 1

    null

  Memory.subscribe "localName", false, update
  Memory.subscribe "assets", false, update
  update()
