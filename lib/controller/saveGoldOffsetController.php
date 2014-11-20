<?php

class saveGoldOffsetController extends ajaxcontroller {
    
    private $gold_offset;
    private $id;
    
    public function __construct() {
        parent::__construct();
        
        $this->gold_offset = $this->get_from_get_post('gold_offset');
        $this->id = $this->get_from_get_post('id');
        log::doLog("POST: ".print_r($_POST, true));

    } 
    public function doAction() {
        $gold_offset = (int)$this->gold_offset;
        $id          = (int)$this->id;
        
        log::doLog("CASMACAT: gold offset: ".$gold_offset." id: ".$id);
        
        $db = Database::obtain();
       try {
            $db->query("UPDATE fixation_event SET gold_offset='$gold_offset' WHERE header_id = '$id'");
        }
        catch (Exception $e) {
            log::doLog("CASMACAT: expection ".$e);   
        }
    }
}
?>