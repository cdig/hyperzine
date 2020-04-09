package hyperzine.filesystem
{
  import hyperzine.asset.AssetController;
  import flash.filesystem.File;
  
  public class Database
  {
    private static var databaseURL:String;
    private static var saver:JSONSaver = new JSONSaver;
    private static var loader:JSONLoader = new JSONLoader;
    private static var callback:Function;
    
    public static function load(callback:Function)
    {
      Database.callback = callback;
      
      // If the database is acting up, check the file at ~/Library/Preferences/Hyperzine/Local Store/
      var file:File = File.applicationStorageDirectory.resolvePath("Database.cdig");
      databaseURL = file.url;
      
      if (file.exists)
        loader.load("Database", databaseURL, didLoad);
      else
      {
        var temp:File = File.createTempFile();
        temp.moveTo(file, true);
        callback();
      }
    }
    
    public static function save()
    {
      var databaseObject:Object = {};
      
      databaseObject.nextAssetID = DropboxController.getNextAssetID();
      databaseObject.assets = AssetController.packAssets();
      
      saver.save("Database", databaseURL, databaseObject);
    }
    
    private static function didLoad(databaseObject:Object)
    {
      if (databaseObject.nextAssetID != null)
        DropboxController.setNextAssetID(databaseObject.nextAssetID);
      
      if (databaseObject.assets != null)
        AssetController.unpackAssets(databaseObject.assets);
      
      callback();
    }
  }
}