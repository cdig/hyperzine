package hyperzine.gui
{
  import hyperzine.gui.GUI;
  import hyperzine.tag.TagPanelView;
  import flash.events.MouseEvent;
  import flash.display.Sprite;
  
  public class ScrollingList extends Sprite
  {
    private var items:SuperArray = new SuperArray;
    private var invalidated:Boolean = false;
    private var scrollRate:Number = 4;
    private var sortOptions:Array;
    private var container:Sprite;
    private var listMask:Sprite;
    private var hit:Sprite;
    private var w:int;
    private var h:int;
    
    public function ScrollingList(w:int, h:int, sortOptions:Array)
    {
      this.w = w;
      this.h = h;
      this.sortOptions = sortOptions;
      
      setupSprites();
      resize();
    }
    
    public function addItem(item:Sprite)
    {
      container.addChild(item);
      items.push(item);
      invalidate();
      
      if (item is TagPanelView)
        item["setList"](this);
    }
    
    public function removeItem(item:Sprite)
    {
      if (!container.contains(item))
        return;
      
      container.removeChild(item);
      items.remove(item);
      invalidate();
    }
    
    public function resize()
    {
      invalidate();
      
      hit.graphics.clear();
      hit.graphics.beginFill(0, 0);
      hit.graphics.drawRect(-GUI.COL*3, 0, GUI.COL*(w+3), GUI.ROW*h);
      hit.mouseEnabled = false;
      
      listMask.graphics.clear();
      listMask.graphics.beginFill(0, 1);
      listMask.graphics.drawRect(0, 0, GUI.COL*w, GUI.ROW*h);
      listMask.mouseEnabled = false;
    }
    
    public function invalidate()
    {
      if (!invalidated)
        When(this, Has.ENTER_FRAME, organize);
      
      invalidated = true;
    }
    
    private function reposition()
    {
      items.sortOn(sortOptions, Array.CASEINSENSITIVE);
      
      for (var i:int; i < items.length; i++)
        Automate({ on: items[i], y: i*GUI.ROW, time: 0.66, ease: "quadratic" });
      
      invalidated = false;
    }
    
    private function organize()
    {
      items.sortOn(sortOptions, Array.CASEINSENSITIVE);
      
      for (var i:int; i < items.length; i++)
        Automate({ on: items[i], y: i*GUI.ROW, time: 0 });
      
      invalidated = false;
      
      mouseWheel();
    }
    
    private function setupSprites()
    {
      container = new Sprite;
      addChild(container);
      
      listMask = new Sprite;
      addChild(listMask);
      container.mask = listMask;
      
      hit = new Sprite;
      addChild(hit);
      
      addEventListener(MouseEvent.MOUSE_WHEEL, mouseWheel);
      SuperButton.rollOut(this, reposition, false);
    }
    
    private function mouseWheel(e:MouseEvent = null)
    {
      if (e != null)
      {
        container.y += e.delta*scrollRate
        e.updateAfterEvent();
      }
      
      if (container.height > GUI.ROW*h)
        container.y = SuperMath.clip(container.y, -(container.height - listMask.height), 0);
      else
        container.y = 0;
    }
  }
}