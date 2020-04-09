package hyperzine.filesystem
{
  import hyperzine.gui.Err;
  import hyperzine.asset.AssetController;
  import flash.filesystem.File;
  
  public class DropboxAssets
  {
    static var nextAssetID:int = 1;
    private static var folder:File;
    private static var username:String;
    
    static function setup(dropboxFolder:File)
    {
      username = ConfigModel.username;
      folder = dropboxFolder.resolvePath("Assets");
      
      if(!folder.exists || !folder.isDirectory)
        throw new Error("Cannot find Dropbox Assets folder");

      AssetController.setAssetsFolder(folder);
    }
    
    static function getNextAssetFolderName():String
    {
      do
        var assetFolder:File = folder.resolvePath(username + " " + nextAssetID++);
      while (assetFolder.exists);
      
      return assetFolder.name;
    }
  }
}