Take ["MainView", "NavView", "Globals"], (MainView, NavView)->
  Make "RootView", ()->
    Preact.h "root-view", null,
      NavView()
      MainView()
