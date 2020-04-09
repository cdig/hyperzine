package hyperzine.asset
{
  import hyperzine.filesystem.DropboxController;
  import hyperzine.filesystem.AsynchUpdater;
  import flash.filesystem.File;
  
  public class AssetsFolder
  {
    private static var folder:File;
    private static var asynchUpdater:AsynchUpdater;
    
    public static function set(folder:File)
    {
      AssetsFolder.folder = folder;
      asynchUpdater = new AsynchUpdater(folder);
    }
    
    public static function get():File
    {
      return folder;
    }
    
    static function updateFromDropbox()
    {
      asynchUpdater.update(AssetFactory.update);
    }
    
    static function deleteAsset(assetModel:AssetModel)
    {
      if (folder.resolvePath(assetModel.id).exists)
        folder.resolvePath(assetModel.id).deleteDirectory(true);
    }
  }
}