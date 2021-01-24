/* Search Result Model
* When search query observers are updated,
* they check with this class to see if they
* are a result.
*/

package hyperzine.search
{
  public class SearchResultModel
  {
    static var results:int;

    static function registerResult()
    {
      results++;
    }
    
    static function hasResults():Boolean
    {
      return results > 0;
    }

    static function clearResults()
    {
      results = 0;
    }
  }
}