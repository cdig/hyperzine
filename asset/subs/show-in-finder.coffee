{ shell } = require "electron"

Take ["PubSub", "Paths", "State"], ({Sub}, Paths, State)->

  Sub "Show In Finder", ()->
    shell.showItemInFolder Paths.files State.asset
