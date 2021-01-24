package hyperzine.search
{
  public class SearchQueryController
  {
    public static function setQuery(input:String)
    {
      if (SearchQueryModel.getInputQuery() != input)
      {
        SearchQueryModel.setQuery(input);
        SearchResultController.clearResults();
        notifyObservers();
      }
    }
    
    public static function getInputQuery():String
    {
      return SearchQueryModel.getInputQuery();
    }
    
    public static function getCleanQuery():String
    {
      return SearchQueryModel.getCleanQuery();
    }
    
    public static function hasQuery():Boolean
    {
      return SearchQueryModel.hasQuery();
    }
    
    // OBSERVER PATTERN
    private static var observers:SuperArray = new SuperArray;
    public static function addObserver(callback:Function) { observers.push(callback) }
    public static function removeObserver(callback:Function) { observers.remove(callback) }
    private static function notifyObservers() { for each (var callback:Function in observers) callback() }
  }
}