# Take ["Env", "Log", "Memory", "NativeThumbnail", "Read", "SipsThumbnail", "Write"], (Env, Log, Memory, NativeThumbnail, Read, SipsThumbnail, Write)->
#   promises = {}
#
#   sipsFormats = {"3fr","arw","astc","avci","bmp","cr2","cr3","crw","dcr","dds","dng","dxo","erf","exr","fff","gif","heic","heics","heif","icns","ico","iiq","jp2","jpeg","jpg","ktx","mos","mpo","mrw","nef","nrw","orf","orf","orf","pbm","pdf","pef","pic","pict","png","psd","pvr","raf","raw","rw2","rwl","sgi","sr2","srf","srw","tga","tiff","webp"}
#
#
#
#   # thumbnails are generated lazily, triggered by being viewed?
#
#
#
#   #
#
#   assets
#     assetId:
#       name:
#       files:
#         name: name
#         path:
#         count: 0
#         children: [
#
#         ]
#
#       tags:
#       shot:
#       thumbnails:
#         # big flat list of files with hash names . size . jpg
#         # the chosen thumbnail for the asset itself should just be size.jpg
#
#
#
#   hash = (asset, file)->
#     assetsFolder = Memory "assetsFolder"
#
#     # Path to source file, relative to assets folder
#     subpath = source.replace assetsFolder, ""
#
#
#
#   Memory.subscribe "assets", (assets, changedAssets)->
#
#     for id of changedAssets
#       if asset = assets[id]?
#         unless asset.thumbnail?
#
#
#
#
#   loadThumbnail = (asset)->
#
#     if asset.shot?
#
#       # Attempt to upgrade the shot using the original file
#       if asset.files?.count > 0
#         shotSourceName = asset.shot.replace /\.png/, ""
#         for child in asset.files.children when child.name is shotSourceName
#           path = Paths.file asset, shotSourceName
#           # create-thumbnails will resolve with null if it fails to create shots
#           thumbnails = await DB.send "create-thumbnails", path # TODO: create 512 and 128 thumbs
#           if thumbnails
#
#
#       # We're still here — that means we couldn't upgrade the shot.
#       # Just use the shot.
#
#       # create-thumbnails will resolve with null if it fails to create a shot
#       path = Paths.shot asset
#       success = await DB.send "create-thumbnails", path # TODO: create 512 and 128 thumbs
#       return if success
#
#
#     # We don't have a screenshot. Attempt to use a random file.
#     if asset.files?.count > 0
#
#       for file in asset.files.children
#         thumbPath = card._thumbPath ?= await DB.send "create-thumbnails", file.path
#         if thumbPath
#           path = thumbPath
#           break
#
#
#
#   Ports.on "create-thumbnails", (source)->
#
#     assetsFolder = Memory "assetsFolder"
#
#     # Path to source file, relative to assets folder
#     subpath = source.replace assetsFolder, ""
#
#     sourceExt = Array.last(subpath.split ".").toLowerCase()
#
#     # We're going to be asked to preview a few known formats pretty often,
#     # and we don't yet have any way to preview them.
#     return if sourceExt is "swf"
#
#     destExt = if sourceExt is "png" then "png" else "jpg"
#
#     assetId = Array.first Read.split subpath
#     thumbnailsFolder = Read.path assetsFolder, assetId, "Thumbnail Cache"
#
#     hash = String.hash subpath
#
#     await p1 = load source, thumbnailsFolder, hash, 128, sourceExt, destExt
#     return unless p1?
#     await p2 = load source, thumbnailsFolder, hash, 512, sourceExt, destExt
#     return unless p2?
#
#     return true # success
#
#
#   load = (source, thumbnailsFolder, hash, size, sourceExt, destExt)->
#
#     dest = Read.path thumbnailsFolder, "#{hash}-#{size}.#{destExt}"
#
#     # If we have previously generated a thumbnail, we're done!
#     return dest if await Read.exists dest
#
#     Write.sync.mkdir thumbnailsFolder
#
#     p = if Env.isMac and sipsFormats[sourceExt]?
#       promises[source] ?= SipsThumbnail source, dest, size, destExt
#     else
#       promises[source] ?= NativeThumbnail source, dest, size, destExt
#
#     p.then (v)-> Memory "thumbnails.#{source}", v or false
#
#     return p
