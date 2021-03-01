Take [], ()->
  assets = {}

  Assets = (_assets)->
    assets = _assets if _assets?
    assets

  Assets.update = (updatedAsset)->
    existingAsset = assets[updatedAsset.id] ?= {}
    existingAsset[k] = v for k, v of updatedAsset
    existingAsset

  Assets.delete = (assetId)->
    asset = assets[assetId]
    delete assets[assetId]
    asset

  Make "Assets", Assets
