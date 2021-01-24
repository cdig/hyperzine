package hyperzine.asset
{
  import hyperzine.filesystem.Property;
  import hyperzine.tag.TagAssigner;
  import flash.filesystem.File;
  
  public class AssetTags
  {
    private var model:AssetModel;
    private var tagsProperty:Property;
    
    public function AssetTags(model:AssetModel)
    {
      this.model = model;
      var tagsFolder:File = AssetsFolder.get().resolvePath(model.id).resolvePath("Tags");
      tagsProperty = new Property(tagsFolder, Property.getAllStrings);
    }
    
    function update()
    {
      if (tagsProperty.update())
        for each (var tagName:String in tagsProperty.value)
          TagAssigner.assignTagNameToAsset(tagName, model);
    }
    
    function hasTagNames():Boolean
    {
      return tagsProperty.hasValue();
    }
    
    function getTagNames():Array
    {
      return tagsProperty.value;
    }

    function assumeTagNames(tagNames:Array)
    {
      if (tagNames != null)
        tagsProperty.softSet(tagNames);
    }
    
    function assignTagName(tagName:String)
    {
      tagsProperty.addString(tagName);
      notifyObservers();
    }
    
    function removeTagName(tagName:String)
    {
      tagsProperty.removeString(tagName);
      notifyObservers();
    }
    
    // OBSERVER PATTERN
    private var observers:SuperArray = new SuperArray;
    public function addObserver(callback:Function) { observers.push(callback) }
    public function removeObserver(callback:Function) { observers.remove(callback) }
    private function notifyObservers() { for each (var callback:Function in observers) callback() }
  }
}