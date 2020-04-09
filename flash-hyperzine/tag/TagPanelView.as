package hyperzine.tag
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.gui.Interactive;
  import hyperzine.gui.ScrollingList;
  import hyperzine.select.SelectionController;
  import flash.display.Sprite;
  
  public class TagPanelView extends Interactive
  {
    public var disabled:Boolean;
    
    private var bg:Sprite;
    private var model:TagModel;
    private var list:ScrollingList;
    private var field:SuperTextField;
    
    public function TagPanelView(model:TagModel)
    {
      this.model = model;
      
      name = model.name;
      
      SuperButton.click(this, clickAction);
      
      addChild(bg = new Sprite);

      makeField(name);
      
      disable();
      resize();
      
      cacheAsBitmap = true;
    }
    
    public function resize()
    {
      field.scaleX = 1;
      field.scaleX = Math.min(1, GUI.COL*13/field.width);
      Draw.box(bg, 0, 0, field.width + 12, GUI.ROW-1);
    }
    
    public function enable()
    {
      disabled = false;
      update();
    }
    
    public function disable()
    {
      disabled = true;
      update();
    }
    
    public function setList(list:ScrollingList)
    {
      this.list = list;
    }
    
    private function clickAction()
    {
      disabled = !disabled;
      
      if (disabled)
        TagAssigner.removeTagNameFromAsset(model.name, SelectionController.getSelection());
      else
        TagAssigner.assignTagNameToAsset(model.name, SelectionController.getSelection());
      
      update();
    }
    
    private function update()
    {
      bg.alpha = disabled ? .5 : 1;
    }

    private function makeField(fieldText:String)
    {
      field = new SuperTextField;
      addChild(field);
      
      field.format.color = Draw.UI_C;
      field.setText(fieldText);
      
      field.height = 18;
      field.x = 5;
      field.y = 2;
    }
  }
}