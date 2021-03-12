{ app } = require "electron"

Take [], ()->
  Make "AboutPanel", AboutPanel =
    setup: ()->
      app.setAboutPanelOptions
        copyright: "© Should Be Abolished :)"
