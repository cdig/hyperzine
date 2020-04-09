package hyperzine.filesystem
{
  import hyperzine.gui.Err;
  import flash.filesystem.File;
  import io.json.decodeJson;
  import io.DataLoader;
  
  public class ConfigModel
  {
    public static var username:String;
    public static var dropboxPath:String;
    
    private static var loader:DataLoader;
    private static var callback:Function;
    
    public static function loadConfig(callback:Function)
    {
      ConfigModel.callback = callback;
      
      // Prepare to locate the path to the config file
      var configFolder:File = new File(File.applicationDirectory.nativePath);
      var configFile:File = configFolder.resolvePath("Config.cdig");
      
      // Search parent directories until we find the config file (it'll be different for Mac and Win)
      while (configFolder.parent != null && !configFile.exists)
      {
        configFolder = configFolder.parent;
        configFile = configFolder.resolvePath("Config.cdig");
      }
      
      if (!configFile.exists)
        Err.or("Can't Find Config File");
      
      loader = new DataLoader(configFile.url, gotConfig, configLoadFail);
    }
    
    private static function gotConfig(configText:String)
    {
      try {
        var configObject:Object = decodeJson(configText);
      } catch (e:Error) {
        return Err.or("Decoding Config JSON Failed");
      }
      
      username = configObject.username;
      dropboxPath = configObject.dropboxPath;
      
      callback();
    }
    
    private static function configLoadFail()
    {
      Err.or("Loading Config Failed");
    }
  }
}