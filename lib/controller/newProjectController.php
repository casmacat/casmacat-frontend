<?php
include_once INIT::$MODEL_ROOT . "/queries.php";
include_once INIT::$UTILS_ROOT . "/langs/languages.inc.php";

class newProjectController extends viewcontroller {
	private $guid = '';
    private $mt_engines;
    private $tms_engines;
    private $source_languages;
    private $target_languages;
    public function __construct() {
        parent::__construct();
	if (!isset($_REQUEST['fork'])){
       	 parent::makeTemplate("upload.html");
	}else{
		parent::makeTemplate("upload_cloud.html");

	}
		$this->guid = $this->create_guid();
    }
    
    public function doAction(){
		if (!isset($_COOKIE['upload_session'])) {
    			setcookie("upload_session", $this->guid,time()+86400);
		}else{
			$this->guid = $_COOKIE['upload_session'];
		}
	
	$intDir=INIT::$UPLOAD_ROOT.'/'.$this->guid.'/';
	if (!is_dir($intDir)) {
		mkdir($intDir, 0775, true);
	}

        $this->mt_engines = getEngines('MT');
        $this->tms_engines = getEngines('TM');
        $this->source_languages = $this->getLanguages( INIT::$SOURCE_LANGUAGE );
        $this->target_languages = $this->getLanguages( INIT::$TARGET_LANGUAGE );
    }
    
    public function getLanguages( $language_spec ) {
        $languages = array();
        $lang_handler=languages::getInstance("en");
        if (strcmp($language_spec,"") == 0) {
          $language_spec = "zh-CN,cs-CZ,da-DK,nl-NL,en-GB,fr-FR,fi-FI,de-DE,el-GR,he-IL,ja-JA,ko-KR,it-IT,no-NO,pl-PL,pt-PT,ru-RU,es-ES,sv-SE";
        }
        $list = explode(",",$language_spec);
        if (count($list) > 1) {
          $languages[] = array("name" => "Autodetect", "code" => "", "default" => 1);
        }
        foreach($list as $language) {
          $name = $lang_handler->iso2Language($language);
          if (strlen($language) == 2) {
            $name = ereg_replace(" *\(.+\)","",$name); # remove country name if not specified
          }
          $languages[] = array("name" => $name, "code" => $language, "default" => 0);
        }
        return $languages;
    }

    public function setTemplateVars() {
        $this->template->upload_session_id = $this->guid;
        $this->template->mt_engines = $this->mt_engines;
        $this->template->tms_engines = $this->tms_engines;
        $this->template->source_languages = $this->source_languages;
        $this->template->target_languages = $this->target_languages;
    }

    public function create_guid($namespace = '') {     
	   static $guid = '';
	   $uid = uniqid("", true);
	   $data = $namespace;
	   $data .= $_SERVER['REQUEST_TIME'];
	   $data .= $_SERVER['HTTP_USER_AGENT'];
	   if (isset($_SERVER['LOCAL_ADDR'])) {
	   	$data .= $_SERVER['LOCAL_ADDR']; // Windows only
	   }
	   if (isset($_SERVER['LOCAL_PORT'])) {
	    $data .= $_SERVER['LOCAL_PORT']; // Windows only
	   }
	   $data .= $_SERVER['REMOTE_ADDR'];
	   $data .= $_SERVER['REMOTE_PORT'];
	   $hash = strtoupper(hash('ripemd128', $uid . $guid . md5($data)));
	   $guid = '{' .   
	       substr($hash,  0,  8) .
	       '-' .
	       substr($hash,  8,  4) .
	       '-' .
	       substr($hash, 12,  4) .
	       '-' .
	       substr($hash, 16,  4) .
	       '-' .
	       substr($hash, 20, 12) .
	       '}';
	   return $guid;
	}
}


?>
