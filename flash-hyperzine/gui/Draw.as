package hyperzine.gui
{
  import flash.geom.Matrix;
  import flash.display.Sprite;
  import flash.display.GradientType;
  import flash.display.DisplayObject;
  import flash.filters.DropShadowFilter;
  
  public class Draw
  {
    public static const UI_C:int = 0x3D5166;
    public static const DARK_C:int = 0x353F47;
    public static const WHITE_C:int = 0xFFFFFF;
    public static const INPUT_C:int = 0x0063BE;
    public static const INSET_C:int = 0xCEDAE5;
    
    public static function box(target:Sprite, x:Number, y:Number, width:Number, height:Number)
    {
      var matrix:Matrix = new Matrix;
      matrix.createGradientBox(1, height, -Math.PI/2);
      
      target.graphics.clear();
      target.graphics.lineStyle(1, 0, 0, false);
      target.graphics.lineGradientStyle(GradientType.LINEAR, [UI_C, WHITE_C], [0.30,0.15], [0,255], matrix);
      target.graphics.beginGradientFill(GradientType.LINEAR, [WHITE_C, WHITE_C, WHITE_C], [0.9, 0.95, 0.85], [0,64, 255], matrix);
      target.graphics.drawRoundRect(x, y, width, height, Math.min(width, height, GUI.ROW*2));
      target.graphics.endFill();
    }
    
    public static function createBox(target:Sprite, x:Number, y:Number, width:Number, height:Number)
    {
      box(target, x, y, width, height);
      
      var cx:Number = x + width/2;
      var cy:Number = y + height/2;
      var matrix:Matrix = new Matrix;
      var radius:Number = Math.min(width, height)/3;
      matrix.createGradientBox(radius*2, radius*2, Math.PI/2);
      matrix.tx = cx;
      matrix.ty = cy;
      
      target.graphics.lineStyle(1, INSET_C, 1, true);
      target.graphics.beginGradientFill(GradientType.RADIAL, [INSET_C, INSET_C], [1, 0.3], [0, 255], matrix);
      target.graphics.drawCircle(cx, cy, radius);
      target.graphics.endFill();
    }
    
    public static function shadow(target:DisplayObject, dist:Number = 1, angle:Number = 90, color:uint = DARK_C, alpha:Number = 0.5, x:Number = 1, y:Number = 1, strength:Number = 1, quality:int = 3)
    {
      target.filters = [new DropShadowFilter(dist, angle, color, alpha, x, y, strength, quality)];
    }
    
    public static function clearShadow(target:DisplayObject)
    {
      target.filters = [];
    }
  }
}