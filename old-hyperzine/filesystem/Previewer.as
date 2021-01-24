package hyperzine.filesystem
{
  import hyperzine.asset.AssetModel;
  import flash.filesystem.FileStream;
  import flash.filesystem.FileMode;
  import flash.filesystem.File;
  import io.png.PNGEncoder;
  import io.BinaryLoader;
  import cdig.APIObject;
  
  public class Previewer
  {
    private static const SIZE:int = 200;
    
    private static var binaryLoader:BinaryLoader = new BinaryLoader;
    private static var stream:FileStream = new FileStream;
    private static var childAPI:APIObject;
    
    private static var queued:Array = [];
    private static var current:Object;
    
    public static function setup()
    {
      API.user.addChild(binaryLoader);
      binaryLoader.visible = false;
    }
    
    public static function queue(assetFolder:File, assetFile:File, completeCallback:Function)
    {
      queued.push({assetFolder:assetFolder, assetFile:assetFile, complete:completeCallback});
      
      if (current == null)
        makeNextInQueue();
    }
    
    private static function makeNextInQueue()
    {
      if (queued.length == 0)
      {
        current = null;
        return;
      }
      
      current = queued.shift();
      
      childAPI = API.clone();
      childAPI.bounds.width = childAPI.bounds.height = SIZE;
      
      binaryLoader.loadAndBuild(current.assetFile.url, childAPI, loaded, fail);
    }
    
    private static function loaded()
    {
      // Wait for the file to finish setup
      When(binaryLoader, Has.ENTER_FRAME, frame1);
    }
    
    private static function frame1()
    {
      // Wait for the file to finish setup
      When(binaryLoader, Has.ENTER_FRAME, frame2);
    }
    
    private static function frame2()
    {
      // Wait for the file to finish setup
      When(binaryLoader, Has.ENTER_FRAME, doEncode);
    }
    
    private static function doEncode()
    {
      binaryLoader.scaleX = SIZE/binaryLoader.contentLoaderInfo.width;
      binaryLoader.scaleY = SIZE/binaryLoader.contentLoaderInfo.height;
      binaryLoader.scaleX = binaryLoader.scaleY = Math.min(binaryLoader.scaleX, binaryLoader.scaleY);
      
      var outWidth:Number = binaryLoader.contentLoaderInfo.width * binaryLoader.scaleX;
      var outHeight:Number = binaryLoader.contentLoaderInfo.height * binaryLoader.scaleY;
      
      // The two 0's are gold-plated (not yet implemented) x and y positions
      PNGEncoder.fromSprite(binaryLoader, outWidth, outHeight, encoded);
    }
    
    private static function encoded()
    {
      // Create a new file to hold the preview screenshot PNG
      var dest:File = current.assetFolder.resolvePath("Shot").resolvePath(current.assetFile.name + ".png");
      var temp:File = File.createTempFile();
      temp.moveTo(dest, true);
      
      stream.open(dest, FileMode.WRITE);
      stream.writeBytes(PNGEncoder.getEncodedByteArray());
      stream.close();
      
      current.complete();
      
      makeNextInQueue();
    }
    
    private static function fail()
    {
      // This is an unsupported file type, so just keep going
      makeNextInQueue();
    }
  }
}