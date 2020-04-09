/* Search Query Model
* Stores the current search query.
* When we search, the query is changed.
* Observers of the search system are notified.
* They update themselves based on the current search terms.
*/

package hyperzine.search
{
  public class SearchQueryModel
  {
    static var inputQuery:String;
    static var cleanQuery:String;
    
    static function setQuery(input:String)
    {
      inputQuery = input;
      cleanQuery = SearchTermCleaner.clean(input);
    }
    
    static function getInputQuery():String
    {
      return inputQuery;
    }
    
    static function getCleanQuery():String
    {
      return cleanQuery;
    }
    
    static function hasQuery():Boolean
    {
      return Boolean(inputQuery);
    }
  }
}