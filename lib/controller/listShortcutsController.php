<?php
class listShortcutsController extends viewcontroller {
  public function __construct() {    
    parent::__construct();
    parent::makeTemplate("listshortcuts.html");
  }

  public function doAction() {        
  }

  public function setTemplateVars() {
    $this->template->basepath = INIT::$BASE_URL;
  }
}
?>
