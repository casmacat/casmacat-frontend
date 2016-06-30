<?php

include_once INIT::$MODEL_ROOT . "/casQueries.php";
include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";
include_once INIT::$UTILS_ROOT . "/Tools.class.php";

class saveLogChunkController extends ajaxcontroller {

    private $jobId;
    private $fileId;
    private $logList;
    private $jsonError;

    private $startTime;

    public function __construct() {
        parent::__construct();

        $this->startTime = Tools::getCurrentMillis();

//        log::doLog("CASMACAT: saveLogChunkController->__construct():");

        $this->jobId = $this->get_from_get_post("jobId");
        $this->fileId = $this->get_from_get_post("fileId");
        $this->logList = json_decode($this->get_from_get_post("logList"));

        $this->jsonError = json_last_error();

//        $this->logList = $this->get_from_get_post("logList");

//        log::doLog("CASMACAT: saveLogChunkController->__construct(): Initialized: jobId: '$this->jobId', fileId: '$this->fileId', logList: '"
//            . print_r($this->logList, true) . "'");
    }

    public function doAction() {

        if ($this->jsonError !== JSON_ERROR_NONE) {
            $this->result["code"] = $this->jsonError;

            $msg = "Unknown error";
            switch ($this->jsonError) {
                case JSON_ERROR_NONE:   // No error has occurred
                    break;
                case JSON_ERROR_DEPTH:
                    $msg = "The maximum stack depth has been exceeded";
                    break;
                case JSON_ERROR_STATE_MISMATCH:
                    $msg = "Invalid or malformed JSON";
                    break;
                case JSON_ERROR_CTRL_CHAR:
                    $msg = "Control character error, possibly incorrectly encoded";
                    break;
                case JSON_ERROR_SYNTAX:
                    $msg = "Syntax error";
                    break;
                case JSON_ERROR_UTF8:
                    $msg = "Malformed UTF-8 characters, possibly incorrectly encoded";
                    break;
            }

            $this->result["errors"][] = array("code" => -1, "message" => "Unexcpected JSON decode error: '$msg'");
            log::doLog("CASMACAT: saveLogChunkController->doAction(): Unexcpected JSON decode error: '$msg', logList: '"
                . print_r($this->logList, true) . "'");
            return;
        }

        $db = Database::obtain();
        $db->query("SET AUTOCOMMIT=0");
        $db->query("START TRANSACTION");

        try {
            $eventCount = count($this->logList);
            log::doLog("CASMACAT: saveLogChunkController->doAction(): Processing of logList containing '" . $eventCount . "' elements...");

            if (!is_array($this->logList)) {
                log::doLog("CASMACAT: saveLogChunkController->doAction(): Not an array: '" . print_r($this->logList, true) . "'.");
                throw new Exception("CASMACAT: saveLogChunkController->doAction(): Not an array: '" . print_r($this->logList, true) . "'.");
            }

            
            // TODO how about transactions?
            foreach ($this->logList as $key => $value) {
//                $value = (object) $value;
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
                        $logEvent->gazeData($value);
                        insertGazeEvent($logEvent);
                        break;
                    case LogEvent::FIXATION:
                        $logEvent->fixationData($value);
                        insertFixationEvent($logEvent);
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
                    case LogEvent::SUGGESTION_CHOSEN:
                        $logEvent->suggestionChosenData($value);
                        insertSuggestionChosenEvent($logEvent);
                        break;
                    case LogEvent::DELETING_SUGGESTION:
                        $logEvent->deletingSuggestionData($value);
                        insertDeletingSuggestionEvent($logEvent);
                        break;
                    case LogEvent::SUGGESTION_DELETED:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::STATS_UPDATED:
                        $logEvent->statsUpdatedData($value);
                        insertStatsUpdatedEvent($logEvent);
                        break;
                    
                    case LogEvent::DECODE:
                    case LogEvent::ALIGNMENTS:
                    case LogEvent::SUFFIX_CHANGE:
                    case LogEvent::CONFIDENCES:
                    case LogEvent::TOKENS:
                    case LogEvent::SHOW_ALIGNMENT_BY_KEY:
                    case LogEvent::HIDE_ALIGNMENT_BY_KEY:
                        $logEvent->itpData($value);
                        insertItpEvent($logEvent);
                        break;
                    case LogEvent::SHOW_ALIGNMENT_BY_MOUSE:
                    case LogEvent::HIDE_ALIGNMENT_BY_MOUSE:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::KEY_DOWN:
                    case LogEvent::KEY_UP:
                        $logEvent->keyData($value);
                        insertKeyEvent($logEvent);
                        break;

                    case LogEvent::MOUSE_DOWN:
                    case LogEvent::MOUSE_UP:
                    case LogEvent::MOUSE_CLICK:
                    case LogEvent::MOUSE_MOVE:
                        $logEvent->mouseData($value);
                        insertMouseEvent($logEvent);
                        break;

                    case LogEvent::BEFORE_CUT:
                    case LogEvent::BEFORE_COPY:
                    case LogEvent::BEFORE_PASTE:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::VIS_MENU_DISPLAYED:
                    case LogEvent::VIS_MENU_HIDDEN:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::INITIAL_CONFIG:
                    case LogEvent::CONFIG_CHANGED:
                        $logEvent->configData($value);
                        insertConfigEvent($logEvent);
                        break;
                    case LogEvent::MOUSE_WHEEL_DOWN:
                    case LogEvent::MOUSE_WHEEL_UP:
                    case LogEvent::MOUSE_WHEEL_INVALIDATE:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::MEMENTO_UNDO:
                    case LogEvent::MEMENTO_REDO:
                    case LogEvent::MEMENTO_INVALIDATE:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::SR_MENU_DISPLAYED:
                    case LogEvent::SR_MENU_HIDDEN:
                    case LogEvent::SR_MATCH_CASE_ON:
                    case LogEvent::SR_MATCH_CASE_OFF:
                    case LogEvent::SR_REG_EXP_ON:
                    case LogEvent::SR_REG_EXP_OFF:
                    case LogEvent::SR_RULES_SETTING:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::SR_RULES_SET:
                        $logEvent->srRulesSetData($value);
                        insertSrEvent($logEvent);
                        break;
                    case LogEvent::SR_RULES_APPLIED:
                    case LogEvent::SR_RULE_DELETED:
                        insertLogEventHeader($logEvent);
                        break;
                    // merc - adding float prediction, biconcordancer and translation_option
                    case LogEvent::FLOAT_PREDICTION_SHOW:
                        $logEvent->floatPredictionShowData($value);
                        insertFloatPredictionShowEvent($logEvent);
                        break;
                    case LogEvent::FLOAT_PREDICTION_ACCEPT:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::UPDATE_SHADE_OFF_TRANSLATED_SOURCE:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::BICONCOR:
                        $logEvent->biconcorData($value);
                        insertBiconcorEvent($logEvent);
                        break;
                    case LogEvent::BICONCOR_CLOSED:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::TRANSLATION_OPTION:
                        insertLogEventHeader($logEvent);
                        break;
                    // merc - adding epen
                    case LogEvent::EPEN_OPENED:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::EPEN_CLOSED:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::HTR_RESULT:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_UPDATE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_NBEST_CLICK:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_TEXT_CHANGE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_START:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_ADD_STROKE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_END:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_GESTURE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    // merc - blur/focus
                    case LogEvent::BLUR:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::FOCUS:
                        insertLogEventHeader($logEvent);
                        break;
                    // interaction with ITP server
                    case LogEvent::EMIT:
                        $logEvent->itpServerData($value);
                        insertItpServerEvent($logEvent);
                        break;
                    case LogEvent::RESULT:
                        $logEvent->itpServerData($value);
                        insertItpServerEvent($logEvent);
                        break;
                                        
                    default:
//                        $db->query("COMMIT");   // at least, store what was ok
//                        $db->query("SET AUTOCOMMIT=1");

//                        $this->result["executionTime"] = time() - $this->startTime;
                        $this->result["code"] = -1;
                        $this->result["errors"][] = array("code" => -1, "message" => "Unknown log event type: '$logEvent->type' at index: '$key'");
                        log::doLog("CASMACAT: saveLogChunkController->doAction(): '$logEvent->type' at index: '$key'");
    //                    throw new Exception("CASMACAT: saveLogChunkController->doAction(): Unknown log event type: '$logEvent->type' at index: '$key'");
//                        return -1;    // do not stop saving of events here
                }
            }
            $db->query("COMMIT");
            $db->query("SET AUTOCOMMIT=1");

            $this->result["executionTime"] = Tools::getCurrentMillis() - $this->startTime;
            if (!isset($this->result["code"])) {
                $this->result["code"] = 0;
            }
            $this->result["data"] = "OK";
            log::doLog("CASMACAT: saveLogChunkController->doAction(): Processing of logList containing '" . $eventCount . "' elements finished, time used: '" . $this->result["executionTime"] . "' ms.");
        }
        catch (Exception $e) {
            $db->query("COMMIT");   // at least, store what was ok
            $db->query("SET AUTOCOMMIT=1");

//            $this->result["executionTime"] = time() - $this->startTime;
            $this->result["code"] = -1;
            $this->result["errors"][] = array("code" => -1, "message" => "Unexpected error: '" . $e->GetMessage() . "'");
            log::doLog("CASMACAT: saveLogChunkController->doAction(): Unexpected error: '" . $e->GetMessage() . "'");
        }
    }
}

?>
