package hyperzine.asset
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.gui.Grid;
  import hyperzine.gui.Interactive;
  import hyperzine.asset.LoadedShot;
  import hyperzine.select.SelectionController;
  import flash.filesystem.File;
  
  public class GridBox extends SuperSprite
  {
    public var showInGrid:Boolean;
    
    private var shot:LoadedShot;
    private var model:AssetModel;
    private var field:SuperTextField;
    private var bg:Interactive;
    
    public function GridBox(model:AssetModel)
    {
      this.model = model;
      
      model.info.addObserver(updateName);
      model.search.addObserver(updateSearch);

      makeField();
      addChild(bg = new Interactive);
      addChild(shot = new LoadedShot(resize));
      shot.mouseEnabled = shot.mouseChildren = false;
      shot.setModel(model);
      
      SuperButton.click(bg, clickAction);
      
      //cacheAsBitmap = true;
      
      Grid.add(this);
      
      resize();
    }

    public function resize()
    {
      Draw.box(bg, 0, 0, GUI.COL*6, GUI.ROW*4);
      
      shot.width = GUI.COL*5;
      shot.height = GUI.ROW*3;
      shot.scaleX = shot.scaleY = Math.min(shot.scaleX, shot.scaleY);
      shot.x = GUI.COL*3 - shot.width/2;
      shot.y = GUI.ROW*2 - shot.height/2;
      
      field.width = GUI.COL*6;
      field.y = GUI.ROW*4.2;
    }
    
    function destroy()
    {
      Grid.remove(this);
      model.info.removeObserver(updateName);
      model.search.removeObserver(updateSearch);
    }
    
    private function rename(label:String)
    {
      field.setText(label, "center");
      name = label;
      autoSize();
      resize();
    }
    
    private function autoSize()
    {
      var size:int = 16;
      
      while(field.height > GUI.ROW*2.8)
      {
        field.format.size = --size;
        field.applyFormat();
      }
    }
    
    private function updateName()
    {
      if (model.info.hasName())
        rename(model.info.getName());
    }
    
    private function updateSearch()
    {
      var needToShow:Boolean = model.search.isResult();
      
      if (needToShow && !showInGrid)
      {
        showInGrid = true;
        shot.setModel(model);
      }
      else if (!needToShow && showInGrid)
      {
        showInGrid = false;
        shot.setModel(null);
      }
    }
    
    private function clickAction()
    {
      SelectionController.setSelection(model);
    }
    
    private function makeField()
    {
      field = new SuperTextField;
      field.format.color = Draw.DARK_C;
      field.wordWrap = true;
      addChild(field);
      
      Draw.shadow(field, 1, 90, Draw.WHITE_C);
      field.mouseEnabled = false;
    }
  }
}