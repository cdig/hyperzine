package hyperzine.asset
{
  import hyperzine.filesystem.Property;
  import flash.filesystem.File;
  
  public class AssetFiles
  {
    private var model:AssetModel;
    private var filesFolder:File;
    private var filesProperty:Property;
    private var fileNames:Array = [];
    
    public function AssetFiles(model:AssetModel)
    {
      this.model = model;
      filesFolder = AssetsFolder.get().resolvePath(model.id).resolvePath("Files");
      filesProperty = new Property(filesFolder, Property.getAllFiles);
    }
    
    function update()
    {
      if (filesProperty.update())
      {
        fileNames = [];
        for each (var file:File in filesProperty.value)
          fileNames.push(file.name);
        
        notifyObservers();
      }
    }
    
    function hasFiles():Boolean
    {
      return filesProperty.hasValue();
    }
    
    function getFiles():Array
    {
      return filesProperty.value;
    }
    
    function getFileNames():Array
    {
      return fileNames;
    }
    
    function assumeFileNames(fileNames:Array)
    {
      this.fileNames = fileNames || [];
      notifyObservers();
    }
    
    function addFiles(files:Array)
    {
      if (files == null || files.length == 0)
        return;
      
      var file:File;
      
      for each (file in files)
        if (!file.isHidden)
          file.copyTo(filesFolder.resolvePath(file.name), true);
      
      update();
      
      if (!model.shot.hasShot())
        for each (file in filesProperty.value)
          if(model.shot.createShot(file))
            return;
    }
    
    function addFolder(folder:File)
    {
      folder.copyTo(filesFolder.resolvePath(folder.name), true);
      update();
    }
    
    function exportFiles(exportDirectory:File)
    {
      if (filesProperty.hasValue())
        for each (var file:File in filesProperty.value)
          file.copyTo(exportDirectory.resolvePath(file.name), true);
    }
        
    // OBSERVER PATTERN
    private var observers:SuperArray = new SuperArray;
    public function addObserver(callback:Function) { observers.push(callback) }
    public function removeObserver(callback:Function) { observers.remove(callback) }
    private function notifyObservers() { for each (var callback:Function in observers) callback() }
  }
}