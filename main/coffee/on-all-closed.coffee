{ app } = require "electron"

app.on "window-all-closed", ()-> # We need to subscribe to this event to stop the default auto-close behaviour
