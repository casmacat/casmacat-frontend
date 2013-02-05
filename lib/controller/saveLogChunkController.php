<?php

include_once INIT::$MODEL_ROOT . "/casQueries.php";
include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";

class saveLogChunkController extends ajaxcontroller {

    private $jobId;
    private $fileId;
    private $logList;

    public function __construct() {
        parent::__construct();

//        log::doLog("CASMACAT: saveLogChunkController->__construct():");

        $this->jobId = $this->get_from_get_post("jobId");
        $this->fileId = $this->get_from_get_post("fileId");
        $this->logList = json_decode($this->get_from_get_post("logList"));

        log::doLog("CASMACAT: saveLogChunkController->__construct(): Initialized: jobId: '$this->jobId', fileId: '$this->fileId', logList: '"
            . print_r($this->logList, true) . "'");
    }

    public function doAction() {

        log::doLog("CASMACAT: saveLogChunkController->doAction(): Processing of logList containing '" . count($this->logList) . "' elements...");

        // TODO how about transactions?
        foreach ($this->logList as $key => $value) {
            $logEvent = new LogEvent($this->jobId, $this->fileId, $value);

            switch ($logEvent->type) {
                case LogEvent::START_SESSION:
                    insertLogEventHeader($logEvent);
                    break;
                case LogEvent::STOP_SESSION:
                    insertLogEventHeader($logEvent);
                    break;
                case LogEvent::RESIZE:
                    $logEvent->resizeData($value);
                    insertResizeEvent($logEvent);
                    break;
                case LogEvent::TEXT:
                    $logEvent->textData($value);
                    insertTextEvent($logEvent);
                    break;
                case LogEvent::SELECTION:
                    $logEvent->selectionData($value);
                    insertSelectionEvent($logEvent);
                    break;
                case LogEvent::SCROLL:
                    $logEvent->scrollData($value);
                    insertScrollEvent($logEvent);
                    break;
                case LogEvent::GAZE:
                    $logEvent->eyeData($value);
                    $logEvent->eyeGazeData($value);
//                    insertEyeGazeEvent($logEvent);
                    break;
                case LogEvent::FIX:
                    $logEvent->eyeData($value);
                    $logEvent->eyeFixData($value);
//                    insertEyeFixEvent($logEvent);
                    break;

                case LogEvent::DRAFTED:
                case LogEvent::TRANSLATED:
                case LogEvent::APPROVED:
                case LogEvent::REJECTED:
                    insertLogEventHeader($logEvent);
                    break;

                case LogEvent::VIEWPORT_TO_SEGMENT:
                    insertLogEventHeader($logEvent);
                    break;

                case LogEvent::SOURCE_COPIED:
                    insertLogEventHeader($logEvent);
                    break;

                case LogEvent::SEGMENT_OPENED:
                    insertLogEventHeader($logEvent);
                    break;
                case LogEvent::SEGMENT_CLOSED:
                    insertLogEventHeader($logEvent);
                    break;

                case LogEvent::LOADING_SUGGESTIONS:
                    insertLogEventHeader($logEvent);
                    break;

                case LogEvent::SUGGESTIONS_LOADED:
                    $logEvent->suggestionsLoadedData($value);
                    insertSuggestionsLoadedEvent($logEvent);
                    break;

                case LogEvent::DECODE:
                case LogEvent::ALIGNMENTS:
                case LogEvent::SUFFIX_CHANGE:
                case LogEvent::CONFIDENCES:
                case LogEvent::TOKENS:
                    $logEvent->itpData($value);
                    insertItpEvent($logEvent);
                    break;
                case LogEvent::SHOW_ALIGNMENT:
                case LogEvent::HIDE_ALIGNMENT:
                    insertLogEventHeader($logEvent);
                    break;

                case LogEvent::SUGGESTION_CHOSEN:
                    $logEvent->suggestionChosenData($value);
                    insertSuggestionChosenEvent($logEvent);
                    break;

                default:
                    $this->result["code"] = -1;
                    $this->result["errors"][] = array("code" => -1, "message" => "Unknown log event type: '$logEvent->type' at index: '$key'");
                    log::doLog("CASMACAT: saveLogChunkController->doAction(): '$logEvent->type' at index: '$key'");
                    return -1;
            }
        }

        $this->result["code"] = 0;
        $this->result["data"] = "OK";
        log::doLog("CASMACAT: saveLogChunkController->doAction(): Processing of logList containing '" . count($this->logList) . "' elements finished.");
    }
}

?>
