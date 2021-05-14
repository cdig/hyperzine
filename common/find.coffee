# The main window sets up a global Command-F menu item, which will forward
# a "find" IPC event to the frontmost window. Here we catch it and pass it along
# to any interested parties in this window.

Take ["IPC", "PubSub"], (IPC, {Pub, Sub})->
  IPC.on "find", ()-> Pub "find"
