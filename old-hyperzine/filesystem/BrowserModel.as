package hyperzine.filesystem
{
  import flash.events.Event;
  import flash.events.FileListEvent;
  import flash.filesystem.File;
  
  public class BrowserModel
  {
    private static var callback:Function;
    private static var file:File = new File;
    
    public static function browseForFiles(callback:Function, prompt:String)
    {
      BrowserModel.callback = callback;
      
      file.addEventListener(FileListEvent.SELECT_MULTIPLE, acceptMultiple);
      file.addEventListener(Event.CANCEL, cancel);
      
      file.browseForOpenMultiple(prompt);
    }
    
    public static function browseForFolder(callback:Function, prompt:String)
    {
      BrowserModel.callback = callback;
      
      file.addEventListener(Event.SELECT, acceptSingle);
      file.addEventListener(Event.CANCEL, cancel);
      
      file.browseForDirectory(prompt);
    }
    
    private static function acceptMultiple(e:FileListEvent)
    {
      removeListeners();
      
      callback(e.files);
    }
    
    private static function acceptSingle(e:Event)
    {
      removeListeners();
      
      callback(file.clone());
    }
    
    private static function cancel(e:Event)
    {
      removeListeners();
    }
    
    private static function removeListeners()
    {
      file.removeEventListener(FileListEvent.SELECT_MULTIPLE, acceptMultiple);
      file.removeEventListener(Event.SELECT, acceptSingle);
      file.removeEventListener(Event.CANCEL, cancel);
    }
  }
}