package hyperzine.gui
{
  import hyperzine.panel.PanelView;
  import hyperzine.search.SearchBar;
  import hyperzine.filesystem.Previewer;
  import drawingTools.Dispatcher;
  
  public class GUI extends SuperSprite
  {
    public static var ROW:Number = 20;
    public static var COL:Number = 20;
    
    private static var errorView:Err;
    private static var closeView:Close;
    private static var brandView:Brand;
    private static var searchBar:SearchBar;
    private static var gridView:Grid;
    private static var createButton:CreateButton;
    private static var panelView:PanelView;
    
    public static function fail()
    {
      errorView.show();
      
      closeView.hide();
      brandView.hide();
      searchBar.hide();
      gridView.hide();
      createButton.hide();
      panelView.hide();
    }
    
    public function GUI()
    {
      addChild(errorView = new Err);
      addChild(closeView = new Close);
      addChild(brandView = new Brand);
      addChild(searchBar = new SearchBar);
      addChild(gridView = new Grid);
      addChild(createButton = new CreateButton);
      addChild(panelView = new PanelView);
      
      SuperEvent.resize(API.user, doResize, true);
      
      // Show the UI only after we're done the stuttering initialization
      hide(0);
      When(this, Has.ENTER_FRAME, show);
    }
    
    private function doResize()
    {
      Dispatcher.run(this, "resize");
    }

    public function resize()
    {
      COL = API.outer.width/64;
      ROW = API.outer.height/36;
      
      brandView.y = API.outer.y + ROW;
      searchBar.y = API.outer.y + ROW*6;
      createButton.y = API.outer.y + ROW*9;
      gridView.y = API.outer.y + ROW*9;
      panelView.y = API.outer.y + ROW*9;
    }
  }
}