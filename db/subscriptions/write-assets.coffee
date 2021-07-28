




# Having a system that automatically responds to changes in an asset in memory
# by writing them to disk is risky. We could end up in situations where watch-assets
# notices some changes, triggers a reload, then the reload happens and that changes the asset in memory,
# then write-assets is triggered, then it checks the disk and in the time between the reload
# and write-assets running, the disk has changed again (eg: due to dropbox), so write-assets ends up
# clobbering dropbox. That's bad.

# We should probably make it so that anything that changes some data inside an asset needs to tell
# both memory and the disk to update. We update memory so that the GUI can update right away. We also
# manually tell the disk to update (via some Ports call, of course) instead of relying on something like
# write-assets, so that we have a sense of provenance for changes, and so that we err on the side of
# missing writes to the disk (which is less bad) instead of writing things we didn't mean to write
# (which is worse, because it can cause inadvertant deletions).

# Also, the disk updates should be *sync* so that if there's a bunch of changes that need to be
# persisted individually, we don't end up interleaving the writes and watch-assets reads.
# By doing a bunch of writes in sync, that's basically like putting the writes inside a transaction.
# *If* we notice performance issues, we can come up with something more elaborate to make asnyc writing
# work (eg: by pausing watch-assets or something)









# Take ["ADSR", "Log", "Memory", "Read", "Write"], (ADSR, Log, Memory, Read, Write)->
#
#   enabled = false
#   changed = {}
#   permittedKeys = name: "Name", shot: "Shot", tags: "Tags"#, files: "Files"
#
#   update = ADSR 1, 1, ()->
#     for id, changes of changed
#       if changes? then updateAsset id, changes else deleteAsset id
#     changed = {}
#
#   deleteAsset = (id)->
#     Log "Deleting asset?"
#     return unless id?.length > 0
#     assetsFolder = Memory "assetsFolder"
#     path = Read.path assetsFolder, id
#     if Read(path)?
#       Write.sync.rm path
#
#   updateAsset = (id, changes)->
#     for k, v of changes
#       folder = permittedKeys[k]
#       continue unless folder # The change was an asset property that doesn't get saved
#       if v?
#         updateProperty id, folder, v
#       else
#         deleteProperty id, folder
#     null
#
#   updateProperty = (id, folder, v)->
#     v = [v] unless v instanceof Array
#     assetsFolder = Memory "assetsFolder"
#     path = Read.path assetsFolder, id, folder
#     Write.sync.array path, v
#
#   deleteProperty = (id, folder)->
#     assetsFolder = Memory "assetsFolder"
#     path = Read.path assetsFolder, id, folder
#     current = Read path
#     return unless current?.length > 0
#     path = Read.path path, current[0] if current.length is 1
#     Write.sync.rm path
#
#   Memory.subscribe "assets", false, (assets, changedAssets)->
#     return unless enabled # Persisting changes will be paused during big loads
#     console.log "WRITING", Object.clone changedAssets
#     changed = Object.merge changed, changedAssets
#     update()
#
#   Make "WriteAssets", WriteAssets =
#     enable: (enable = true)-> enabled = enable
