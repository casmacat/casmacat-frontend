<?php

include_once INIT::$MODEL_ROOT . "/casQueries.php";
include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";

class loadLogChunkController extends ajaxcontroller {

    private $jobId;
    private $fileId;
    private $startOffset;
    private $endOffset;

    public function __construct() {
        parent::__construct();

//        log::doLog("CASMACAT: loadLogChunkController->__construct():");

        $this->jobId = $this->get_from_get_post("jobId");
        $this->fileId = $this->get_from_get_post("fileId");
        $this->startOffset = $this->get_from_get_post("startOffset");
        $this->endOffset = $this->get_from_get_post("endOffset");

        log::doLog("CASMACAT: loadLogChunkController->__construct(): Initialized: jobId: '$this->jobId', fileId: '$this->fileId', "
            . "startOffset: '$this->startOffset', endOffset: '$this->endOffset'");
    }

    public function doAction() {
        try {
            log::doLog("CASMACAT: loadLogChunkController->doAction(): Loading logListChunk...");

            $logListChunk = fetchLogChunk($this->jobId, $this->fileId, $this->startOffset, $this->endOffset);

            if ($logListChunk < 0) {
                $this->result["code"] = -1;
                $this->result["errors"][] = array("code" => -1, "message" => "Error loading logListChunk");
            }
            else if (count($logListChunk) == 0) {
                $this->result["code"] = 1;
                $this->result["data"] = "No more data";
            }
            else {
                $this->result["code"] = 0;
    //            $this->result["data"]["logListChunk"] = json_encode($logListChunk);
                $this->result["data"]["logListChunk"] = $logListChunk;
            }

            log::doLog("CASMACAT: loadLogChunkController->doAction(): Loading of logListChunk finished, " . count($logListChunk) . " events loaded.");
        }
        catch (Exception $e) {
            $this->result["code"] = -1;
            $this->result["errors"][] = array("code" => -1, "message" => "Unexcpected error: '" . $e->GetMessage() . "'");
            log::doLog("CASMACAT: loadLogChunkController->doAction(): Unexcpected error: '" . $e->GetMessage() . "'");
        }
    }
}

?>
