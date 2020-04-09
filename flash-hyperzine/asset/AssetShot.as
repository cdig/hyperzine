package hyperzine.asset
{
  import hyperzine.filesystem.Previewer;
  import hyperzine.filesystem.Property;
  import flash.filesystem.File;
  
  public class AssetShot
  {
    private var model:AssetModel;
    private var shotProperty:Property;
    
    public function AssetShot(model:AssetModel)
    {
      this.model = model;
      var shotFolder:File = AssetsFolder.get().resolvePath(model.id).resolvePath("Shot");
      shotProperty = new Property(shotFolder, Property.getFirstFile);
    }

    function update()
    {
      if (shotProperty.update())
        notifyObservers();
    }
    
    function hasShot():Boolean
    {
      return shotProperty.hasValue();
    }
    
    function getShot():File
    {
      return shotProperty.value;
    }
    
    function deleteShot()
    {
      shotProperty.clearValue();
    }
    
    function createShot(file:File)
    {
      if (file.name.toLowerCase().search(/(swf|jpg|jpeg|gif|png)$/) > 0)
      {
        deleteShot();
        
        Previewer.queue(AssetsFolder.get().resolvePath(model.id), file, forcedUpdate);
        return true;
      }
      return false;
    }
    
    private function forcedUpdate()
    {
      shotProperty.update(true);
      notifyObservers();
    }
    
    
    
    // OBSERVER PATTERN
    private var observers:SuperArray = new SuperArray;
    public function addObserver(callback:Function) { observers.push(callback) }
    public function removeObserver(callback:Function) { observers.remove(callback) }
    private function notifyObservers() { for each (var callback:Function in observers) callback() }
  }
}