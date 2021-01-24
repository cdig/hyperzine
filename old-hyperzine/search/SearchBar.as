package hyperzine.search
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.gui.Interactive;
  import hyperzine.select.SelectionController;
  import flash.events.FocusEvent;
  import flash.events.Event;
  
  public class SearchBar extends Interactive
  {
    private static var field:SuperTextField;

    static function setFocus()
    {
      field.stage.focus = field;
      var caretIndex:int = Math.round(field.mouseX * field.text.length/field.width);
      field.setSelection(caretIndex, caretIndex);
      SelectionController.clearSelection();
    }
    
    private static function fieldChanged(e:Event = null)
    {
      SelectionController.clearSelection();
      SearchQueryController.setQuery(field.text);
    }
    
    
    private var clearSearchIcon:ClearSearchIcon;
    
    public function SearchBar()
    {
      addChild(clearSearchIcon = new ClearSearchIcon);
      
      SuperButton.click(this, setFocus);
      When(this, Has.STAGE, setFocus);
      mouseChildren = true;
      tabChildren = true;
      
      makeField();
      resize();
      
      SearchQueryController.addObserver(queryChanged);
      SearchResultController.addObserver(searchChanged);
      field.addEventListener(Event.CHANGE, fieldChanged);
      field.addEventListener(FocusEvent.FOCUS_IN, fieldChanged);
    }

    public function resize()
    {
      Draw.box(this, 0, 0, 20*GUI.COL, 40);
      
      field.width = GUI.COL*20 - 70;
      x = API.outer.x + GUI.COL*22;
    }

    private function queryChanged()
    {
      field.setText(SearchQueryController.getInputQuery());
    }
    
    private function searchChanged()
    {
      if (!SearchResultController.hasResults())
        field.format.color = 0x990000;
      else
        field.format.color = Draw.INPUT_C;
      
      field.applyFormat();
    }
    
    private function makeField()
    {
      field = new SuperTextField;
      field.format.color = Draw.INPUT_C;
      field.format.size = 20;
      field.applyFormat();
      field.makeInput();
      addChild(field);
      
      field.height = 22;
      field.x = 35;
      field.y = 9;
    }
  }
}