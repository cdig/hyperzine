package hyperzine.asset
{
  import flash.filesystem.File;
  import io.BinaryLoader;
  
  public class LoadedShot extends SuperSprite
  {
    private var shot:BinaryLoader;
    private var loadCallback:Function;
    private var model:AssetModel;
    private var loaded:File;
    
    public function LoadedShot(loadCallback:Function = null)
    {
      this.loadCallback = loadCallback;
      
      addChild(shot = new BinaryLoader);
    }

    public function setModel(model:AssetModel)
    {
      if (this.model)
      {
        this.model.shot.removeObserver(loadShot);
        shot.destroy();
        loaded = null;
      }
      
      this.model = model;
      
      if (model != null)
      {
        model.shot.addObserver(loadShot);
        loadShot();
      }
    }
    
    private function loadShot()
    {
      var shotFile:File = model.shot.getShot();
      
      if (loaded == shotFile || shotFile == null)
        return;
      
      loaded = shotFile;
      
      shot.loadAndBuild(shotFile.url, null, gotShot, loadFailed);
    }
    
    private function gotShot()
    {
      if (loadCallback != null)
        loadCallback();
    }
    
    private function loadFailed()
    {
      trace("LOAD FAILED");
    }
  }
}