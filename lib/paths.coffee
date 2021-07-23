Take ["Read"], (Read)->

  Make "Paths", Paths =
    file: (asset, filename)->      Read.path Paths.files(asset), filename
    files: (asset)->               Read.path asset.path, "Files"
    name: (asset)->                Read.path asset.path, "Name", asset.name
    shot: (asset)->                Read.path asset.path, "Shot", asset.shot
    tag: (asset, tag)->            Read.path Paths.tags(asset), tag
    tags: (asset)->                Read.path asset.path, "Tags"
    thumbnail: (asset, filename)-> Read.path Paths.thumbnails(asset), filename
    thumbnails: (asset)->          Read.path asset.path, "Thumbnail Cache"
    thumbnailName: (file, size)->  "#{String.hash file.relpath}-#{size}.jpg"

    ext:
      icon: {"indb", "css", "dwg", "as", "fla", "idlk", "indd", "swf", null:true, undefined:true} # Include null / undefined because we want those to get an icon, not a thumbnail
      sips: {"3fr","arw","astc","avci","bmp","cr2","cr3","crw","dcr","dds","dng","dxo","erf","exr","fff","gif","heic","heics","heif","icns","ico","iiq","jp2","jpeg","jpg","ktx","mos","mpo","mrw","nef","nrw","orf","orf","orf","pbm","pdf","pef","pic","pict","png","psd","pvr","raf","raw","rw2","rwl","sgi","sr2","srf","srw","tga","tiff","webp"}
      video: {"avchd", "avi", "m4p", "m4v", "mov", "mp2", "mp4", "mpe", "mpeg", "mpg", "mpv", "ogg", "qt", "webm", "wmv"}
