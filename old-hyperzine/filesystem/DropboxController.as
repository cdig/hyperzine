package hyperzine.filesystem
{
  import hyperzine.gui.Err;
  import flash.filesystem.File;
  
  public class DropboxController
  {
    public static function setup(callback:Function)
    {
      var dropboxFolder:File = new File(ConfigModel.dropboxPath).resolvePath("Hyperzine");
      
      if(!dropboxFolder.exists || !dropboxFolder.isDirectory)
        return Err.or("Cannot find Dropbox Folder");
      
      try {
        DropboxAssets.setup(dropboxFolder);
        DropboxTags.setup(dropboxFolder);
      } catch (e:Error) {
        return Err.or(e.message)
      }

      callback();
    }
    
    public static function setNextAssetID(id:int)
    {
      DropboxAssets.nextAssetID = id;
    }

    public static function getNextAssetID():int
    {
      return DropboxAssets.nextAssetID;
    }
    
    public static function getNextAssetFolderName():String
    {
      return DropboxAssets.getNextAssetFolderName();
    }
  }
}