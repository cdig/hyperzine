{ shell } = require "electron"

Take ["Asset", "PubSub"], (Asset, {Sub})->

  Sub "Show In Finder", ()->
    shell.showItemInFolder Asset.folder
