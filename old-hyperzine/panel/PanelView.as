package hyperzine.panel
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.panel.info.InfoPanel;
  import hyperzine.panel.tags.TagsPanel;
  import hyperzine.panel.files.FilesPanel;
  import hyperzine.panel.notes.NotesPanel;
  import hyperzine.panel.actions.ActionsPanel;
  import hyperzine.select.SelectionController;
  import hyperzine.search.SearchQueryController;
  
  public class PanelView extends SuperSprite
  {
    private var infoPanel:InfoPanel;
    private var actionsPanel:ActionsPanel;
    private var filesPanel:FilesPanel;
    private var tagsPanel:TagsPanel;
    private var notesPanel:NotesPanel;
    
    public function PanelView()
    {
      infoPanel = new InfoPanel;
      actionsPanel = new ActionsPanel;
      filesPanel = new FilesPanel;
      tagsPanel = new TagsPanel;
      notesPanel = new NotesPanel;
      
      addChild(infoPanel);
      addChild(actionsPanel);
      addChild(filesPanel);
      addChild(tagsPanel);
      //addChild(notesPanel);
      
      SearchQueryController.addObserver(updateDisplay);
      SelectionController.addObserver(updateDisplay);
      
      hide(0);
    }
    
    public function resize()
    {
      var offset:Number = GUI.COL*5;
      
      infoPanel.x =    offset;
      actionsPanel.x = offset + GUI.COL*16;
      filesPanel.x =   offset + GUI.COL*25;
      tagsPanel.x =    offset + GUI.COL*41;
      notesPanel.x =   offset + GUI.COL*57;
    }
    
    private function updateDisplay()
    {
      if (SelectionController.hasSelection())
        show();
      else
        hide();
    }
  }
}