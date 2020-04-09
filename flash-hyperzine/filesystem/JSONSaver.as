package hyperzine.filesystem
{
  import hyperzine.gui.Err;
  import flash.filesystem.File;
  import flash.filesystem.FileMode;
  import flash.filesystem.FileStream;
  import io.json.encodeJson;
  
  public class JSONSaver
  {
    private var fileStream = new FileStream;
    
    public function save(name:String, url:String, data:Object)
    {
      try {
        var dataString:String = encodeJson(data);
      } catch (e:Error) {
        return Err.or("Encoding " + name + " JSON Failed");
      }
      
      try {
        fileStream.open(new File(url), FileMode.WRITE);
        fileStream.writeUTFBytes(dataString);
        fileStream.close();
      } catch (e:Error) {
        return Err.or("Saving " + name + " Failed");
      }
    }
  }
}