package hyperzine.select
{
  import hyperzine.asset.AssetModel;
  
  public class SelectionController
  {
    private static var selection:AssetModel;
    
    public static function setSelection(input:AssetModel)
    {
      if (selection != input)
      {
        selection = input;
        notifyObservers();
      }
    }
    
    public static function clearSelection()
    {
      setSelection(null);
    }
    
    public static function hasSelection():Boolean
    {
      return selection != null;
    }
    
    public static function getSelection():AssetModel
    {
      return selection;
    }
    
    // OBSERVER PATTERN
    private static var observers:SuperArray = new SuperArray;
    public static function addObserver(callback:Function) { observers.push(callback) }
    public static function removeObserver(callback:Function) { observers.remove(callback) }
    private static function notifyObservers() { for each (var callback:Function in observers) callback() }
  }
}