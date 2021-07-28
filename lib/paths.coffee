Take ["Read"], (Read)->

  Make "Paths", Paths =
    files: (asset)->               Read.path asset.path, "Files"
    names: (asset)->               Read.path asset.path, "Name"
    shots: (asset)->               Read.path asset.path, "Shot"
    newShots: (asset)->            Read.path asset.path, "Shot (New)"
    tags: (asset)->                Read.path asset.path, "Tags"
    thumbnails: (asset)->          Read.path asset.path, "Thumbnail Cache"

    file: (asset, filename)->      Read.path Paths.files(asset), filename
    name: (asset)->                Read.path Paths.names(asset), asset.name
    shot: (asset)->                Read.path Paths.shots(asset), asset.shot
    newShot: (asset)->             Read.path Paths.newShots(asset), asset.newShot
    thumbnail: (asset, filename)-> Read.path Paths.thumbnails(asset), filename
    tag: (asset, tag)->            Read.path Paths.tags(asset), tag

    thumbnailName: (file, size)->  "#{String.hash file.relpath}-#{size}.jpg"

    ext:
      icon: {"indb", "css", "dwg", "as", "fla", "idlk", "indd", "swf", null:true, undefined:true} # Include null / undefined because we want those to get an icon, not a thumbnail
      sips: {"3fr","arw","astc","avci","bmp","cr2","cr3","crw","dcr","dds","dng","dxo","erf","exr","fff","gif","heic","heics","heif","icns","ico","iiq","jp2","jpeg","jpg","ktx","mos","mpo","mrw","nef","nrw","orf","orf","orf","pbm","pdf","pef","pic","pict","png","psd","pvr","raf","raw","rw2","rwl","sgi","sr2","srf","srw","tga","tiff","webp"}
      video: {"avchd", "avi", "m4p", "m4v", "mov", "mp2", "mp4", "mpe", "mpeg", "mpg", "mpv", "ogg", "qt", "webm", "wmv"}
