package hyperzine.gui
{
  public class Interactive extends SuperSprite
  {
    public function Interactive()
    {
      SuperButton.rollOver(this, over);
      SuperButton.rollOut(this, out);
    }

    protected function over()
    {
      Draw.shadow(this, 1, 90, Draw.WHITE_C, 0.7);
    }

    protected function out()
    {
      Draw.shadow(this, 1, 90, 0, 0);
    }
  }
}