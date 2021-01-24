package hyperzine.asset
{
  import hyperzine.gui.Err;
  import hyperzine.filesystem.Property;
  import flash.filesystem.File;
  
  public class AssetInfo
  {
    private var model:AssetModel;
    private var nameProperty:Property;
    
    public function AssetInfo(model:AssetModel)
    {
      this.model = model;
      var nameFolder:File = AssetsFolder.get().resolvePath(model.id).resolvePath("Name");
      nameProperty = new Property(nameFolder, Property.getFirstString);
    }

    function update()
    {
      if(nameProperty.update())
        notifyObservers();
    }
    
    function setName(input:String)
    {
      if (input != null)
      {
        nameProperty.changeString(input);
        notifyObservers();
      }
    }
    
    function assumeName(input:String)
    {
      if (input != null)
      {
        nameProperty.softSet(input);
        notifyObservers();
      }
    }
    
    function hasName():Boolean
    {
      return nameProperty.hasValue();
    }
    
    function getName():String
    {
      return nameProperty.value;
    }
    
    function createName()
    {
      if (!hasName())
      {
        var filename:String = model.files.getFileNames()[0];
        
        if (filename)
          setName(makeNiceName(filename));
        else
          Err.or("C:\\HYPERZINE>null\nBad command or file name");
      }
    }
    
    private static function makeNiceName(input:String):String
    {
      input = input.charAt(0).toUpperCase() + input.slice(1);
      input = input.replace(/\.\w+$/, ""); // Grid file extension
      input = input.replace(/_SA$|_V\d+$/g, ""); // Grid "SA" and version number
      input = input.replace(/_/g, " "); // Convert underscores to spaces
      input = input.replace(/([a-z])([A-Z])/g, "$1 $2"); // Put spaces between camelCase words
      input = input.replace(/\s+([a-z])/g, function(...args):String{return " " + args[1].toUpperCase()}); // Capitalize after space
      return input;
    }
    
    // OBSERVER PATTERN
    private var observers:SuperArray = new SuperArray;
    public function addObserver(callback:Function) { observers.push(callback); }
    public function removeObserver(callback:Function) { observers.remove(callback); }
    private function notifyObservers() { for each (var callback:Function in observers) callback(); }
  }
}