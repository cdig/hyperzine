package hyperzine.application
{
  import hyperzine.tag.TagController;
  import hyperzine.asset.AssetController;
  import flash.utils.getTimer;
  
  public class CycleModel
  {
    private static var startTime:int;
    private static var cycleTime:int = 5;
    
    public static function beginRunningCycles()
    {
      SuperEvent.enterFrame(API.user, doCycle);
    }
    
    public static function hasTimeLeft():Boolean
    {
      return getTimer() < startTime + cycleTime;
    }
    
    private static function doCycle()
    {
      startTime = getTimer();
      AssetController.refreshDropbox();
      TagController.refreshDropbox();
    }
  }
}