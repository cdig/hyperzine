package hyperzine.application
{
  import hyperzine.filesystem.Database;
  import flash.desktop.NativeApplication;
  import flash.events.Event;
  
  public class ExitController
  {
    public static function setup()
    {
      // Set up behaviour for exiting the program
      SuperKeyboard.escape(exit);
      API.user.stage.addEventListener(Event.EXITING, exit);
      API.user.stage.nativeWindow.addEventListener(Event.CLOSING, exit);
    }
    
    public static function exit(e:Event = null)
    {
      Database.save();
      
      NativeApplication.nativeApplication.exit();
    }
  }
}