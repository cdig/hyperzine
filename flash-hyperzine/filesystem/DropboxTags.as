package hyperzine.filesystem
{
  import hyperzine.gui.Err;
  import hyperzine.tag.TagController;
  import flash.filesystem.File;
  
  public class DropboxTags
  {
    private static var folder:File;
    
    static function setup(dropboxFolder:File)
    {
      folder = dropboxFolder.resolvePath("Tags");
      
      if(!folder.exists || !folder.isDirectory)
        throw new Error("Cannot find Dropbox Tags folder");
      
      TagController.setTagsFolder(folder);
    }
  }
}