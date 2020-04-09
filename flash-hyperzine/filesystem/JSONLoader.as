package hyperzine.filesystem
{
  import hyperzine.gui.Err;
  import io.DataLoader;
  import io.json.decodeJson;
  
  public class JSONLoader
  {
    private var name:String;
    private var callback:Function;
    private var loader:DataLoader;
    
    public function load(name:String, url:String, callback:Function)
    {
      this.name = name;
      this.callback = callback;
      loader = new DataLoader(url, got, fail);
    }
    
    private function got(jsonText:String)
    {
      try {
        var jsonObject:Object = decodeJson(jsonText);
      } catch (e:Error) {
        trace("Decoding " + name + " JSON Failed");
      }
      
      if (jsonObject != null)
        callback(jsonObject);
    }
    
    private function fail()
    {
      Err.or("Loading " + name + " Failed");
    }
  }
}