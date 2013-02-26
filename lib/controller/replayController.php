<?php

include_once INIT::$MODEL_ROOT . "/queries.php";
include INIT::$UTILS_ROOT . "/mymemory_queries_temp.php";
include INIT::$UTILS_ROOT . "/filetype.class.php";
include INIT::$UTILS_ROOT . "/cat.class.php";
include INIT::$UTILS_ROOT . "/langs/languages.inc.php";
include_once INIT::$MODEL_ROOT . "/casQueries.php";
include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";

class replayController extends viewcontroller {

    private $pname = "";    // Project_Name

    private $tid = "";  // id_translator
    private $private_translator;   // private_translator
    private $id_customer;   // id_customer
    private $private_customer;   // private_customer
    private $jobId = "";  // job_id

    private $source_lang = "";
    private $target_lang = "";
    private $password = "";

    private $fileId = "";
    private $vsSrc = "";
    private $vsWidth = 0;
    private $vsHeight = 0;
    private $startTime = 0;
    private $endTime = 0;


    public function __construct() {
        parent::__construct();
        parent::makeTemplate("replay.html");
        $this->jobId = $this->get_from_get_post("jid");
        $this->password = $this->get_from_get_post("password");

        // url
        if (isset($_SERVER["HTTPS"])) {
            $this->vsSrc = "https://";
        }
        else {
            $this->vsSrc = "http://";
        }
        $this->vsSrc = $this->vsSrc . $_SERVER["SERVER_NAME"] . ":" . $_SERVER["SERVER_PORT"];
        $this->vsSrc = $this->vsSrc . INIT::$BASEURL . "index.php?action=cat&jid=$this->jobId&password=$this->password&page=&replay=true";
    }

    public function doAction() {

        $segment = getSegmentsInfo($this->jobId, $this->password, 0, 1);
        $this->fileId = $segment[0]["id_file"];

//        log::doLog("CASMACAT: replayController->doAction(): Loading meta data...");

        $logListChunk = fetchLogChunk($this->jobId, $this->fileId, 0, 2);
        $this->vsWidth = $logListChunk[1]->width;
        $this->vsHeight = $logListChunk[1]->height;
        $this->startTime = $logListChunk[0]->time;
        $this->endTime = fetchEndTime($this->jobId, $this->fileId);
    }

    public function setTemplateVars() {
        $this->template->pname = $this->pname;

        $this->template->tid = $this->tid;
        $this->template->private_translator = $this->private_translator;
        $this->template->id_customer = $this->id_customer;
        $this->template->private_customer = $this->private_customer;
        $this->template->jobId = $this->jobId;
        $this->template->source_lang = $this->source_lang;
        $this->template->target_lang = $this->target_lang;
        $this->template->password = $this->password;

        $this->template->fileId = $this->fileId;
        $this->template->vsSrc = $this->vsSrc;
        $this->template->vsWidth = $this->vsWidth;
        $this->template->vsHeight = $this->vsHeight;
        $this->template->startTime = $this->startTime;
        $this->template->endTime = $this->endTime;
        $this->template->basepath = INIT::$BASEURL;
        $this->template->itpEnabled = INIT::$ITPENABLED;
    }
}
?>

