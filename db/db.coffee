Take ["Config", "DBState", "IPC", "Log"], (Config, DBState, IPC, Log)->

  # The DB process stores a cache of data in a file, to help it speed up launching. We load that first.
  DBState.init()

  # Next, we load the config file — preference data created by the Setup Assistant and through general user interaction.
  config = Config()

  # Depending on how the config load went, we can continue to launch the main app, or drop
  # the user into the Setup Assistant.
  switch config
    when true
      IPC.send Log "config-ready" # Setup Assistant was previously completed, so launch the main app.
    when false
      IPC.send Log "open-setup-assistant" # Setup Assistant has not been completed, so launch it.
    else
      IPC.send "fatal", "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help."

  # At this point we're done initializing. Here's what happens next:
  # * Either the config file or the Setup Assistant will specify a data folder.
  # * The assets-folder.coffee subscription will make sure we have an Assets folder in the data folder,
  #   and then call LoadAssets() to load all our asset data into memory.
  # * Concurrently with the above, the Main process will launch a Browser window.
  # * As asset data comes into existence, the Browser window will populate itself.
