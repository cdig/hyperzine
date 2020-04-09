package hyperzine.gui
{
  import hyperzine.search.SearchQueryController;
  import hyperzine.asset.AssetController;
  
  public class CreateButton extends SuperSprite
  {
    private var field:SuperTextField;
    private var icon:SuperTextField;
    private var bg:Interactive;
    
    public function CreateButton()
    {
      bg = new Interactive;
      addChild(bg);
      
      makeField();
      makeIcon();
      
      SearchQueryController.addObserver(searchChanged);
      
      SuperButton.click(bg, AssetController.newAssetByImport);
    }
    
    public function resize()
    {
      Draw.createBox(bg, 0, 0, GUI.COL*6, GUI.ROW*4);
      x = API.outer.width/2 - GUI.COL*3;
      icon.y = GUI.ROW*2 - 15;
      field.y = GUI.ROW*4.2;
      icon.width = GUI.COL*6;
      field.width = GUI.COL*6;
    }
    
    private function searchChanged()
    {
      if (SearchQueryController.hasQuery())
        hide(0);
      else
        show();
    }

    private function makeField()
    {
      field = new SuperTextField;
      field.format.color = Draw.DARK_C;
      field.format.size = 16;
      field.wordWrap = true;
      addChild(field);

      Draw.shadow(field, 1, 90, Draw.WHITE_C);
      
      field.setText("New Asset", "center");
    }
    
    private function makeIcon()
    {
      icon = new SuperTextField;
      icon.format.color = Draw.UI_C;
      icon.format.size = 30;
      icon.wordWrap = true;
      addChild(icon);
      
      icon.setText("+A", "center");
      icon.mouseEnabled = false;
    }
  }
}