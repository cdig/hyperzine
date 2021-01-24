package hyperzine.filesystem
{
  import hyperzine.gui.Err;
  import hyperzine.application.CycleModel;
  import flash.events.FileListEvent;
  import flash.filesystem.File;
  import flash.utils.getTimer;
  
  public class AsynchUpdater
  {
    private static var totalTurns:int = 0;
    private static var whoseTurn:int = 0;
    
    private var myTurn:int;
    private var folder:File;
    private var listing:Array;
    private var index:int = 0;
    private var modificationTime:Number;
    private var refreshingDirectoryListing:Boolean = false;
    
    public function AsynchUpdater(folder:File)
    {
      this.folder = folder;
      
      folder.addEventListener(FileListEvent.DIRECTORY_LISTING, gotListing);
      refreshingDirectoryListing = true;
      folder.getDirectoryListingAsync();
      
      myTurn = totalTurns++;
    }
    
    public function update(updateCall:Function)
    {
      if (myTurn != whoseTurn)
        return;
      
      if (refreshingDirectoryListing)
        return;
      
      while(CycleModel.hasTimeLeft() && listing[index])
      {
        updateCall(listing[index]);
        index++;
      }
      
      if (!listing[index])
      {
        index = 0;
        if (folder.modificationDate.time != modificationTime)
        {
          refreshingDirectoryListing = true;
          folder.getDirectoryListingAsync();
        }
        
        whoseTurn = (whoseTurn+1)%totalTurns;
        return;
      }
    }
    
    private function gotListing(e:FileListEvent)
    {
      listing = e.files;
      
      var i:int = listing.length;
      var item:File;
      while(i--)
      {
        item = listing[i];
        if (!item.isDirectory || item.isHidden)
          listing.splice(i, 1);
        else
          listing[i] = item.name
      }
      
      refreshingDirectoryListing = false;
      modificationTime = folder.modificationDate.time;
    }
  }
}