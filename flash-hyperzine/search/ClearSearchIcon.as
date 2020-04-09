package hyperzine.search
{
  public class ClearSearchIcon extends SuperSprite
  {
    private var symbol:ClearSearchIconSymbol;
    
    public function ClearSearchIcon()
    {
      symbol = new ClearSearchIconSymbol;
      addChild(symbol);
      
      symbol.x = 20;
      symbol.y = 20;
      
      symbol.clearIcon.visible = false;
      
      SuperButton.rollOver(symbol.clearIcon, function(){symbol.clearIcon.alpha = .7});
      SuperButton.rollOut(symbol.clearIcon, function(){symbol.clearIcon.alpha = 1});
      SuperButton.click(symbol.clearIcon, clearSearch);
      mouseChildren = true;
      
      SearchQueryController.addObserver(update);
    }
    
    private function clearSearch()
    {
      symbol.clearIcon.alpha = 1;
      SearchQueryController.setQuery("");
      SearchBar.setFocus();
    }
    
    private function update()
    {
      var hasQuery:Boolean = SearchQueryController.hasQuery();
      symbol.searchIcon.visible = !hasQuery;
      symbol.clearIcon.visible = hasQuery;
    }
  }
}