package hyperzine.gui
{
  import hyperzine.asset.GridBox;
  import hyperzine.select.SelectionController;
  import hyperzine.search.SearchQueryController;
  import hyperzine.search.SearchResultController;
  import flash.events.MouseEvent;
  import flash.display.Sprite;
  import flash.geom.Rectangle;
  
  public class Grid extends SuperSprite
  {
    private static var invalidated:Boolean = false;
    private static var boxes:SuperArray = new SuperArray;
    private static var rect:Rectangle = new Rectangle;
    private static var scrollRate:Number = 4;
    private static var scrollLimit:Number;
    private static var container:Sprite;
    private static var thumb:Thumb;
    private static var hit:Sprite;
    private static var nX:int;
    private static var nY:int;
    
    public static function add(box:GridBox)
    {
      box.visible = false;
      container.addChild(box);
      boxes.push(box);
      boxes.sortOn("name", Array.CASEINSENSITIVE);
      invalidate();
    }
    
    public static function remove(box:GridBox)
    {
      if (container.contains(box))
        container.removeChild(box);
      boxes.remove(box);
      invalidate();
    }
    
    public static function invalidate()
    {
      if (!invalidated)
        When(container, Has.ENTER_FRAME, organize);
      
      invalidated = true;
    }
    
    private static function organize()
    {
      invalidated = false;
      
      nX = nY = 0;
      
      for (var i:int = 0; i < boxes.length; i++)
      {
        var box:GridBox = boxes[i];

        box.visible = box.showInGrid;
        
        if (box.showInGrid)
        {
          box.x = nX*GUI.COL*7;
          box.y = nY*GUI.ROW*7;
          nX = (nX+1)%9;
          if (nX == 0)
            nY++;
        }
      }
      
      if (nY == 0)
        rect.x = -GUI.COL/2 * (65 - nX*7);
      else
        rect.x = -GUI.COL;
      
      if (nX > 0)
        nY++;
      
      scrollLimit = Math.max(nY*GUI.ROW*7 - hit.height + GUI.ROW, 0);
      //Draw.box(thumb, -GUI.COL/2, 0, GUI.COL/2, Math.max(GUI.ROW, GUI.ROW*(27-(20*nY*9/(boxes.length+1)))));
      
      updateScroll();
    }

    private static function scrollWheel(e:MouseEvent)
    {
      //thumb.y -= e.delta * scrollRate;
      rect.y -= e.delta * scrollRate;
      e.updateAfterEvent();
      
      updateScroll();
    }
    
    private static function updateScroll()
    {
      rect.y = SuperMath.clip(rect.y, 0, scrollLimit);
      container.scrollRect = rect;
      
      //thumb.y = rect.y/scrollLimit * (GUI.ROW * 27 - thumb.height);
      //thumb.visible = nY > 4;
    }
    
    
    
    
    
    public function Grid()
    {
      addEventListener(MouseEvent.MOUSE_WHEEL, scrollWheel);
      
      SearchResultController.addObserver(organize);
      SearchQueryController.addObserver(updateShowing);
      SelectionController.addObserver(updateShowing);
      
      //addChild(thumb = new Thumb(updateScroll));
      
      addChild(container = new Sprite);
      addChild(hit = new Sprite);
    }
    
    public function resize()
    {
      organize();
      x = API.outer.x;
      
      //thumb.x = API.outer.width;
      
      rect.width = API.outer.width-GUI.COL;
      rect.height = GUI.ROW*27;
      
      hit.mouseEnabled = false;
      hit.graphics.clear();
      hit.graphics.beginFill(0, 0);
      hit.graphics.drawRect(0, 0, API.outer.width, GUI.ROW*27);
    }
    
    private function updateShowing()
    {
      if (!SelectionController.hasSelection() && SearchQueryController.hasQuery())
        show();
      else
        hide();
    }
  }
}