<?php


class createLogDownloadController extends ajaxcontroller {
    
    private $id_job;
    private $id_file;
    //private $file_name;
    //private $src_lang;
    
    public function __construct() {
        parent::__construct();
        
        $this->id_file = $this->get_from_get_post('fileid');
        $this->id_job = $this->get_from_get_post('jobid');
        //$this->file_name = $this->get_from_get_post('filename');
        //$this->src_lang = $this->get_from_get_post('srclang');
        
        log::doLog("POST: ".print_r($_POST, true));
        
        if (empty($this->id_job)) {
            $this->id_job = "Unknown";
        }
    }
    
//public function execInBackground($cmd) {
//     if (substr(php_uname(), 0, 7) == "Windows"){
//         log::doLog("windows");
//         //pclose(popen("start ". $cmd, "r"));
//         $handle = popen("start ". $cmd, "r");
//         $read = fread($handle, 2096);
//         log::doLog($read);
//         //pclose($handle);
//     }
//     else {
//         exec($cmd . " > /dev/null &");
//         log::doLog("here");
//     }
// }

    
    public function doAction() {
        
        //check if id file and job is a number
        //if (is_numeric($this->id_file) && is_numeric($this->id_job))
        //convert id_file and id_job into a numbers
        $id_file = (int)$this->id_file;
        $id_job = (int)$this->id_job;

            
        ini_set('max_execution_time', 6000);

        $ret = -1;
        
        if (substr(php_uname(), 0, 7) == "Windows"){
            log::doLog("windows");
            $ret = pclose(popen("start C:\wamp\bin\php\php5.4.3\php ".INIT::$MODEL_ROOT."/exportLog.php ".$id_file." ".$id_job." 1", "r"));
        }
        else{
            $ret = pclose(popen("nohup php ".INIT::$MODEL_ROOT."/exportLog.php ".$id_file." ".$id_job." 1 &", "r"));
        }
        
        log::doLog("CASMACAT: return exportLog: ".$ret);

        ini_set('max_execution_time', 30);
        
//        $this->filename ="log_id".$this->id_file."_".$this->file_name.".xml";
//        header('Content-Type: text/xml; charset=UTF-8');
//        header('Content-Disposition: attachment; filename="' . $this->file_name . '.xml"');
//        
//        //log::doLog("CASMACAT: file: ".INIT::$LOG_DOWNLOAD . "/" .$this->filename);
//        
//        $this->content = file_get_contents(INIT::$LOG_DOWNLOAD . "/" . $this->filename);
        

        if($ret == "END"){
            $this->result['code'] = 0;
            $this->result['data'] = "OK";
        }
        else{
            $this->result['errors'] = "It is not possible to get the log file";
            $this->result['code'] = -1;
        }
                
    }
    
}
?>
