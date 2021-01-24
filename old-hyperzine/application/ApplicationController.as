package hyperzine.application
{
  import hyperzine.filesystem.DropboxController;
  import hyperzine.filesystem.ConfigModel;
  import hyperzine.filesystem.Previewer;
  import hyperzine.filesystem.Database;
  
  public class ApplicationController
  {
    public static function setup()
    {
      ExitController.setup();
      
      Previewer.setup();
      
      ConfigModel.loadConfig(configReady);
    }
    
    private static function configReady()
    {
      DropboxController.setup(dropboxReady);
    }
    
    private static function dropboxReady()
    {
      Database.load(databaseReady);
    }
    
    private static function databaseReady()
    {
      CycleModel.beginRunningCycles();
    }
  }
}