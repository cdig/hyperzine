package hyperzine.asset
{
  import hyperzine.search.SearchResultController;
  import hyperzine.search.SearchQueryController;
  import hyperzine.search.SearchTermCleaner;

  public class AssetSearch
  {
    private var model:AssetModel;
    private var searchName:String;
    private var result:Boolean;

    public function AssetSearch(model:AssetModel)
    {
      this.model = model;

      model.info.addObserver(updateSearchName);
      model.tags.addObserver(updateSearchName);
      model.files.addObserver(updateSearchName);

      SearchQueryController.addObserver(doSearch);
    }

    function isResult():Boolean
    {
      return result;
    }

    private function updateSearchName()
    {
      var oldSearchName:String = searchName;

      var searchNameTerms:Array = [];

      if (model.info.hasName())
        searchNameTerms.push(model.info.getName());
      if (model.tags.hasTagNames())
        searchNameTerms.push(model.tags.getTagNames().join(" "));
      if (model.files.hasFiles())
        searchNameTerms.push(model.files.getFileNames().join(" "));

      searchName = searchNameTerms.join(" ");
      searchName = SearchTermCleaner.clean(searchName);

      if (searchName != oldSearchName)
        doSearch();
    }

    private function doSearch()
    {
      // First, ensure we exist
      if (!model.exists.doesExist())
        return AssetController.deleteAsset(model);

      result = determineSearchResult();

      if (result)
        SearchResultController.registerResult();

      notifyObservers();
    }

    private function determineSearchResult():Boolean
    {
      if (!SearchQueryController.hasQuery() || !searchName)
        return false;

      var queryTerms:Array = SearchQueryController.getCleanQuery().split(" ");

      for each (var queryTerm:String in queryTerms)
        if (searchName.search(queryTerm) < 0)
          return false;

      return true;
    }

    // OBSERVER PATTERN
    private var observers:SuperArray = new SuperArray;
    public function addObserver(callback:Function) { observers.push(callback) }
    public function removeObserver(callback:Function) { observers.remove(callback) }
    private function notifyObservers() { for each (var callback:Function in observers) callback() }
  }
}
