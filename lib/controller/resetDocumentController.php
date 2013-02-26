<?php

include_once INIT::$MODEL_ROOT . "/casQueries.php";

class resetDocumentController extends ajaxcontroller {

    private $jobId;
    private $fileId;

    public function __construct() {
        parent::__construct();

//        log::doLog("CASMACAT: resetDocumentController->__construct():");

        $this->jobId = $this->get_from_get_post("jobId");
        $this->fileId = $this->get_from_get_post("fileId");

//        log::doLog("CASMACAT: resetDocumentController->__construct(): Initialized: jobId: '$this->jobId', fileId: '$this->fileId'");
    }

    public function doAction() {
        try {
            log::doLog("CASMACAT: resetDocumentController->doAction(): Resetting document...");

            if (!resetDocument($this->jobId, $this->fileId)) {
                $this->result["code"] = -1;
                $this->result["errors"][] = array("code" => -1, "message" => "Error resetting document");
            }
            else {
                $this->result["code"] = 0;
    //            $this->result["data"]["logListChunk"] = json_encode($logListChunk);
                $this->result["data"] = "OK";
            }

            log::doLog("CASMACAT: resetDocumentController->doAction(): Document reset.");
        }
        catch (Exception $e) {
            $this->result["code"] = -1;
            $this->result["errors"][] = array("code" => -1, "message" => "Unexcpected error: '" . $e->GetMessage() . "'");
            log::doLog("CASMACAT: resetDocumentController->doAction(): Unexcpected error: '" . $e->GetMessage() . "'");
        }
    }
}

?>
