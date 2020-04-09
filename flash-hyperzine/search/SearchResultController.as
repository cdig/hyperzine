package hyperzine.search
{
  public class SearchResultController
  {
    public static function registerResult()
    {
      SearchResultModel.registerResult();
      
      invalidate();
    }
    
    public static function hasResults():Boolean
    {
      return SearchResultModel.hasResults();
    }
    
    static function clearResults()
    {
      SearchResultModel.clearResults();
      invalidate();
    }
    
    private static var invalidated:Boolean;
    private static function invalidate()
    {
      if (!invalidated)
        When(API.user, Has.ENTER_FRAME, notifyObservers);
      
      invalidated = true;
    }
    
    // OBSERVER PATTERN
    private static var observers:SuperArray = new SuperArray;
    public static function addObserver(callback:Function) { observers.push(callback); }
    public static function removeObserver(callback:Function) { observers.remove(callback); }
    private static function notifyObservers() { for each (var callback:Function in observers) callback(); invalidated = false; }
  }
}