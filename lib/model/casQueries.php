<?php
include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";

/**
 * Contains all CASMACAT related database queries.
 */

function fetchInitialConfig($jobId, $fileId) {

    $db = Database::obtain();
    $queryId = $db->query("SELECT c.config FROM log_event_header h, config_event c"
            . " WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = c.header_id"
            . " AND h.type = 'initialConfig' ORDER BY h.time ASC LIMIT 0, 1");

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchInitialConfig(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchInitialConfig(): " . print_r($err, true));
//        return $errno * -1;
    }

    return $db->fetch($queryId)["config"];
}

function deleteHeaderRow($id) {

    $db = Database::obtain();
    $db->query("DELETE FROM log_event_header WHERE id = '$id'");

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: deleteHeaderRow(): " . print_r($err, true));
        throw new Exception("CASMACAT: deleteHeaderRow(): " . print_r($err, true));
//        return $errno * -1;
    }

    return true;
}

function deleteEventRow($headerId, $table) {

    $db = Database::obtain();
    $db->query("DELETE FROM $table WHERE header_id = '$headerId'");

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: deleteEventRow(): " . print_r($err, true));
        throw new Exception("CASMACAT: deleteEventRow(): " . print_r($err, true));
//        return $errno * -1;
    }

    return true;
}

/**
 * Loads a log chunk from the database.
 *
 */
function resetDocument($jobId, $fileId) {

    $db = Database::obtain();
    $db->query("SET AUTOCOMMIT=0");
    $db->query("START TRANSACTION");

    $queryId = $db->query("SELECT * FROM log_event_header h WHERE h.job_id = '$jobId' AND h.file_id = '$fileId'"
            . " ORDER BY h.time ASC");

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: resetDocument(): " . print_r($err, true));
        throw new Exception("CASMACAT: resetDocument(): " . print_r($err, true));
//        return $errno * -1;
    }

//    log::doLog("CASMACAT: resetDocument(): Event headers found: '$db->affected_rows'");

    $headerRow = null;
    while ( ($headerRow = $db->fetch($queryId)) != false ) {

        $headerRowAsObject = snakeToCamel($headerRow);

//        log::doLog("CASMACAT: resetDocument(): Next headerRow: " . print_r($headerRowAsObject, true));

        $logEvent = new LogEvent($jobId, $fileId, $headerRowAsObject);
//        log::doLog("CASMACAT: resetDocument(): Processing header id: '$logEvent->id'");

        switch ($logEvent->type) {
            case LogEvent::START_SESSION:
                break;
            case LogEvent::STOP_SESSION:
                break;

            case LogEvent::RESIZE:
                deleteEventRow($logEvent->id, "resize_event");
                break;
            case LogEvent::TEXT:
                deleteEventRow($logEvent->id, "text_event");
                break;
            case LogEvent::SELECTION:
                deleteEventRow($logEvent->id, "selection_event");
                break;
            case LogEvent::SCROLL:
                deleteEventRow($logEvent->id, "scroll_event");
                break;
            case LogEvent::GAZE:
                deleteEventRow($logEvent->id, "gaze_event");
                break;
            case LogEvent::FIXATION:
                deleteEventRow($logEvent->id, "fixation_event");
                break;

            case LogEvent::DRAFTED:
            case LogEvent::TRANSLATED:
            case LogEvent::APPROVED:
            case LogEvent::REJECTED:
                break;

            case LogEvent::VIEWPORT_TO_SEGMENT:
                break;
            case LogEvent::SOURCE_COPIED:
                break;
            case LogEvent::SEGMENT_OPENED:
                break;
            case LogEvent::SEGMENT_CLOSED:
                break;

            case LogEvent::LOADING_SUGGESTIONS:
                break;
            case LogEvent::SUGGESTIONS_LOADED:
                deleteEventRow($logEvent->id, "suggestions_loaded_event");
                break;
            case LogEvent::SUGGESTION_CHOSEN:
                deleteEventRow($logEvent->id, "suggestion_chosen_event");
                break;
            case LogEvent::DELETING_SUGGESTION:
                deleteEventRow($logEvent->id, "deleting_suggestion_event");
                break;
            case LogEvent::SUGGESTION_DELETED:
                break;

            case LogEvent::STATS_UPDATED:
                deleteEventRow($logEvent->id, "stats_event");
                break;

            case LogEvent::DECODE:
            case LogEvent::ALIGNMENTS:
            case LogEvent::SUFFIX_CHANGE:
            case LogEvent::CONFIDENCES:
            case LogEvent::TOKENS:
                deleteEventRow($logEvent->id, "itp_event");
                break;
            case LogEvent::SHOW_ALIGNMENT_BY_MOUSE:
            case LogEvent::HIDE_ALIGNMENT_BY_MOUSE:
            case LogEvent::SHOW_ALIGNMENT_BY_KEY:
            case LogEvent::HIDE_ALIGNMENT_BY_KEY:
                break;

            case LogEvent::KEY_DOWN:
            case LogEvent::KEY_UP:
                deleteEventRow($logEvent->id, "key_event");
                break;

            case LogEvent::MOUSE_DOWN:
            case LogEvent::MOUSE_UP:
            case LogEvent::MOUSE_CLICK:
            case LogEvent::MOUSE_MOVE:
                deleteEventRow($logEvent->id, "mouse_event");
                break;

            case LogEvent::BEFORE_CUT:
            case LogEvent::BEFORE_COPY:
            case LogEvent::BEFORE_PASTE:
                break;

            case LogEvent::VIS_MENU_DISPLAYED:
            case LogEvent::VIS_MENU_HIDDEN:
                break;
            case LogEvent::INITIAL_CONFIG:
            case LogEvent::CONFIG_CHANGED:
                deleteEventRow($logEvent->id, "config_event");
                break;
            case LogEvent::MOUSE_WHEEL_DOWN:
            case LogEvent::MOUSE_WHEEL_UP:
            case LogEvent::MOUSE_WHEEL_INVALIDATE:
                break;
            case LogEvent::MEMENTO_UNDO:
            case LogEvent::MEMENTO_REDO:
            case LogEvent::MEMENTO_INVALIDATE:
                break;

            case LogEvent::SR_MENU_DISPLAYED:
            case LogEvent::SR_MENU_HIDDEN:
            case LogEvent::SR_MATCH_CASE_ON:
            case LogEvent::SR_MATCH_CASE_OFF:
            case LogEvent::SR_REG_EXP_ON:
            case LogEvent::SR_REG_EXP_OFF:
            case LogEvent::SR_RULES_SETTING:
                break;
            case LogEvent::SR_RULES_SET:
                deleteEventRow($logEvent->id, "sr_event");
                break;
            case LogEvent::SR_RULES_APPLIED:
            case LogEvent::SR_RULE_DELETED:
                break;

            default:
                log::doLog("CASMACAT: resetDocument(): Unknown log event type: '$logEvent->type', header id: '$logEvent->id'");
                throw new Exception("CASMACAT: resetDocument(): Unknown log event type: '$logEvent->type', header id: '$logEvent->id'");
//                return -1;
        }
        deleteHeaderRow($logEvent->id);

//        log::doLog("CASMACAT: resetDocument(): Deleted: '" . $logEvent->toString() . "'");
    }

    // reset last_opened_segment
//    $queryId = $db->query("SELECT id FROM segments WHERE id_file = '$fileId' ORDER BY id ASC LIMIT 0, 1");
//
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: resetDocument(): " . print_r($err, true));
//        return $errno * -1;
//    }

    $db->query("UPDATE jobs SET last_opened_segment = '' WHERE id = '$jobId'");
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: resetDocument(): " . print_r($err, true));
        throw new Exception("CASMACAT: resetDocument(): " . print_r($err, true));
//        return $errno * -1;
    }

    $db->query("DELETE FROM segment_translations WHERE id_job = '$jobId'");
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: resetDocument(): " . print_r($err, true));
        throw new Exception("CASMACAT: resetDocument(): " . print_r($err, true));
//        return $errno * -1;
    }

    $db->query("COMMIT");
    $db->query("SET AUTOCOMMIT=1");

    return true;
}

function fetchEndTime($jobId, $fileId) {

    $db = Database::obtain();
    $queryId = $db->query("SELECT * FROM log_event_header h WHERE h.job_id = '$jobId' AND h.file_id = '$fileId'"
            . " ORDER BY h.time DESC LIMIT 0, 1");

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchEndTime(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchEndTime(): " . print_r($err, true));
//        return $errno * -1;
    }

//    log::doLog("CASMACAT: fetchEndTime(): Event headers found: '$db->affected_rows' ");

    $row = $db->fetch($queryId);
    return $row["time"];
}

/**
 * Loads a log chunk from the database.
 *
 */
function fetchLogChunk($jobId, $fileId, $startOffset, $endOffset) {
log::doLog($endOffset);
//    include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";

    $db = Database::obtain();
    $queryId = $db->query("SELECT * FROM log_event_header h WHERE h.job_id = '$jobId' AND h.file_id = '$fileId'"
            . " AND h.type != 'gaze'"
            . " ORDER BY h.time, h.id ASC LIMIT $startOffset, $endOffset");

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        return $errno * -1;
    }

//    log::doLog("CASMACAT: fetchLogChunk(): Event headers found: '$db->affected_rows'");

    $logListChunk = array();
    $headerRow = null;
    while ( ($headerRow = $db->fetch($queryId)) != false ) {

        $headerRowAsObject = snakeToCamel($headerRow);

//        log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($headerRowAsObject, true));

        $logEvent = new LogEvent($jobId, $fileId, $headerRowAsObject);
//        log::doLog("CASMACAT: fetchLogChunk(): Processing header id: '$logEvent->id'");

        switch ($logEvent->type) {
            case LogEvent::START_SESSION:
                break;
            case LogEvent::STOP_SESSION:
                break;

            case LogEvent::RESIZE:
                $eventRow = fetchEventRow($logEvent->id, "resize_event");
                $logEvent->resizeData($eventRow);
                break;
            case LogEvent::TEXT:
                $eventRow = fetchEventRow($logEvent->id, "text_event");
                $logEvent->textData($eventRow);
                break;
            case LogEvent::SELECTION:
                $eventRow = fetchEventRow($logEvent->id, "selection_event");
                $logEvent->selectionData($eventRow);
                break;
            case LogEvent::SCROLL:
                $eventRow = fetchEventRow($logEvent->id, "scroll_event");
                $logEvent->scrollData($eventRow);
                break;
//            case LogEvent::GAZE:
//                $eventRow = fetchEventRow($logEvent->id, "gaze_event");
//                $logEvent->gazeData($eventRow);
//                break;
            case LogEvent::FIXATION:
                $eventRow = fetchEventRow($logEvent->id, "fixation_event");
                $logEvent->fixationData($eventRow);
                break;

            case LogEvent::DRAFTED:
            case LogEvent::TRANSLATED:
            case LogEvent::APPROVED:
            case LogEvent::REJECTED:
                break;

            case LogEvent::VIEWPORT_TO_SEGMENT:
                break;
            case LogEvent::SOURCE_COPIED:
                break;
            case LogEvent::SEGMENT_OPENED:
                break;
            case LogEvent::SEGMENT_CLOSED:
                break;

            case LogEvent::LOADING_SUGGESTIONS:
                break;
            case LogEvent::SUGGESTIONS_LOADED:
                $eventRow = fetchEventRow($logEvent->id, "suggestions_loaded_event");
                $logEvent->suggestionsLoadedData($eventRow);
                break;
            case LogEvent::SUGGESTION_CHOSEN:
                $eventRow = fetchEventRow($logEvent->id, "suggestion_chosen_event");
                $logEvent->suggestionChosenData($eventRow);
                break;
            case LogEvent::DELETING_SUGGESTION:
                $eventRow = fetchEventRow($logEvent->id, "deleting_suggestion_event");
                $logEvent->deletingSuggestionData($eventRow);
                break;
            case LogEvent::SUGGESTION_DELETED:
                break;

            case LogEvent::STATS_UPDATED:
                $eventRow = fetchEventRow($logEvent->id, "stats_event");
                $logEvent->statsUpdatedData($eventRow);
                break;

            case LogEvent::DECODE:
            case LogEvent::ALIGNMENTS:
            case LogEvent::SUFFIX_CHANGE:
            case LogEvent::CONFIDENCES:
            case LogEvent::TOKENS:
            case LogEvent::SHOW_ALIGNMENT_BY_KEY:
            case LogEvent::HIDE_ALIGNMENT_BY_KEY:
                $eventRow = fetchEventRow($logEvent->id, "itp_event");
                $logEvent->itpData($eventRow);
                break;
            case LogEvent::SHOW_ALIGNMENT_BY_MOUSE:
            case LogEvent::HIDE_ALIGNMENT_BY_MOUSE:
                break;

            case LogEvent::KEY_DOWN:
            case LogEvent::KEY_UP:
                $eventRow = fetchEventRow($logEvent->id, "key_event");
                $logEvent->keyData($eventRow);
                break;

            case LogEvent::MOUSE_DOWN:
            case LogEvent::MOUSE_UP:
            case LogEvent::MOUSE_CLICK:
            case LogEvent::MOUSE_MOVE:
                $eventRow = fetchEventRow($logEvent->id, "mouse_event");
                $logEvent->mouseData($eventRow);
                break;

            case LogEvent::BEFORE_CUT:
            case LogEvent::BEFORE_COPY:
            case LogEvent::BEFORE_PASTE:
                break;

            case LogEvent::VIS_MENU_DISPLAYED:
            case LogEvent::VIS_MENU_HIDDEN:
                break;
            case LogEvent::INITIAL_CONFIG:
            case LogEvent::CONFIG_CHANGED:
                $eventRow = fetchEventRow($logEvent->id, "config_event");
                $logEvent->configData($eventRow);
                break;
            case LogEvent::MOUSE_WHEEL_DOWN:
            case LogEvent::MOUSE_WHEEL_UP:
            case LogEvent::MOUSE_WHEEL_INVALIDATE:
                break;
            case LogEvent::MEMENTO_UNDO:
            case LogEvent::MEMENTO_REDO:
            case LogEvent::MEMENTO_INVALIDATE:
                break;

            case LogEvent::SR_MENU_DISPLAYED:
            case LogEvent::SR_MENU_HIDDEN:
            case LogEvent::SR_MATCH_CASE_ON:
            case LogEvent::SR_MATCH_CASE_OFF:
            case LogEvent::SR_REG_EXP_ON:
            case LogEvent::SR_REG_EXP_OFF:
            case LogEvent::SR_RULES_SETTING:
                break;
            case LogEvent::SR_RULES_SET:
                $eventRow = fetchEventRow($logEvent->id, "sr_event");
                $logEvent->srRulesSetData($eventRow);
                break;
            case LogEvent::SR_RULES_APPLIED:
            case LogEvent::SR_RULE_DELETED:
                break;

            default:
                log::doLog("CASMACAT: fetchLogChunk(): Unknown log event type: '$logEvent->type', header id: '$logEvent->id'");
                throw new Exception("CASMACAT: fetchLogChunk(): Unknown log event type: '$logEvent->type', header id: '$logEvent->id'");
//                return -1;
        }

        $logListChunk[] = $logEvent;
//        log::doLog("CASMACAT: fetchLogChunk(): Loaded: '" . $logEvent->toString() . "'");
    }

    if (empty($logListChunk)){
        return false;
    }
    else{
        return $logListChunk;
    }
}

/**
 * Loads one concrete event from its table.
 *
 */
function fetchEventRow($headerId, $table) {

    $db = Database::obtain();
    $queryId = $db->query("SELECT * FROM $table WHERE header_id = '$headerId'");

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchEventRow(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchEventRow(): " . print_r($err, true));
//        return $errno * -1;
    }

    $row = $db->fetch($queryId);

    return snakeToCamel($row);
}

// convert snake case to camel case
function snakeToCamel($row) {
//    log::doLog("CASMACAT: snakeToCamel(): camel case row: " . print_r($row, true));

    static $snakeToCamelCache = array();
    $newRow = array();

    if (!is_array($row)) {
        log::doLog("CASMACAT: snakeToCamel(): Not an array: " . print_r($row, true));
        throw new Exception("CASMACAT: snakeToCamel(): Not an array: " . print_r($row, true));
    }

    foreach ($row as $key => $value) {

        if (isset($snakeToCamelCache[$key])) {
            $newRow[$snakeToCamelCache[$key]] = $value;
//echo "Cache hit: $key -> $snakeToCamelCache[$key]\n";
//            log::doLog("CASMACAT: snakeToCamel(): Cache hit: $key -> $snakeToCamelCache[$key]");
            continue;
        }

        // taken from: http://www.refreshinglyblue.com/2009/03/20/php-snake-case-to-camel-case/
        $s = str_replace(' ', '', ucwords(str_replace('_', ' ', $key)));
        $s = strtolower(substr($s, 0, 1)).substr($s, 1);

        // reorganize the array
        if ($s != $key) {
            $newRow[$s] = $value;
//            unset($row[$key]);
            // cache it
            $snakeToCamelCache[$key] = $s;
//echo "New cache entry: $key -> $snakeToCamelCache[$key]\n";
//            log::doLog("CASMACAT: snakeToCamel(): New cache entry: $key -> $snakeToCamelCache[$key]");
        }
        else {
            $newRow[$key] = $value;
            $snakeToCamelCache[$key] = $key;
//echo "New cache entry: $key -> $snakeToCamelCache[$key]\n";
//            log::doLog("CASMACAT: snakeToCamel(): New cache entry: $key -> $snakeToCamelCache[$key]");
        }
    }

//    return (object)$row;
    return (object)$newRow;
//    log::doLog("CASMACAT: snakeTCoCamel(): camel case row: " . print_r($row, true));
}

/**
 * Inserts an entry into the gaze_event and log_event_header table.
 */
function insertGazeEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["t_time"] = $event->tTime;
    $data["lx"] = $event->lx;
    $data["ly"] = $event->ly;
    $data["rx"] = $event->rx;
    $data["ry"] = $event->ry;
    $data["l_dil"] = $event->lDil;
    $data["r_dil"] = $event->rDil;
    $data["l_char"] = $event->lChar;
    $data["l_offset"] = $event->lOffset;
    $data["r_char"] = $event->rChar;
    $data["r_offset"] = $event->rOffset;

    $db = Database::obtain();
//    $db->query("SET CHARACTER SET utf8");
    $db->insert("gaze_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertGazeEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertGazeEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the fixation_event and log_event_header table.
 */
function insertFixationEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["t_time"] = $event->tTime;
    $data["x"] = $event->x;
    $data["y"] = $event->y;
    $data["duration"] = $event->duration;
    $data["character"] = $event->character;
    $data["offset"] = $event->offset;

    $db = Database::obtain();
    $db->insert("fixation_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertFixationEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertFixationEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the mouse_event and log_event_header table.
 */
function insertMouseEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["which"] = $event->which;
    $data["x"] = $event->x;
    $data["y"] = $event->y;
    $data["shift"] = $event->shift;
    $data["ctrl"] = $event->ctrl;
    $data["alt"] = $event->alt;
    $data["cursor_position"] = $event->cursorPosition;

    $db = Database::obtain();
    $db->insert("mouse_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertMouseEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertMouseEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the key_event and log_event_header table.
 *
 * TODO replace 'character' by 'mappedKey'
 *
 */
function insertKeyEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["cursor_position"] = $event->cursorPosition;
    $data["which"] = $event->which;
    //$data["character"] = $event->character;
    $data["mapped_key"] = $event->mappedKey;
    $data["shift"] = $event->shift;
    $data["ctrl"] = $event->ctrl;
    $data["alt"] = $event->alt;

    $db = Database::obtain();
    $db->insert("key_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertKeyEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertKeyEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the itp_event and log_event_header table.
 *
 */
function insertItpEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["data"] = json_encode($event->data);

    $db = Database::obtain();
    $db->insert("itp_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertItpEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertItpEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the suggestion_choose_event and log_event_header table.
 *
 */
function insertSuggestionsLoadedEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["matches"] = json_encode($event->matches);

    $db = Database::obtain();
    $db->insert("suggestions_loaded_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertSuggestionsLoadedEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertSuggestionsLoadedEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the suggestion_choose_event and log_event_header table.
 *
 */
function insertSuggestionChosenEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["which"] = $event->which;
    $data["translation"] = $event->translation;

    $db = Database::obtain();
    $db->insert("suggestion_chosen_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertSuggestionChosenEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertSuggestionChosenEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the deleting_suggestion_event and log_event_header table.
 *
 */
function insertDeletingSuggestionEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["which"] = $event->which;

    $db = Database::obtain();
    $db->insert("deleting_suggestion_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertDeletingSuggestionEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertDeletingSuggestionEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the stats_event and log_event_header table.
 *
 */
function insertStatsUpdatedEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["stats"] = json_encode($event->stats);

    $db = Database::obtain();
    $db->insert("stats_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertStatsUpdatedEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertStatsUpdatedEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the resize_event and log_event_header table.
 *
 */
function insertResizeEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["width"] = $event->width;
    $data["height"] = $event->height;

    $db = Database::obtain();
    $db->insert("resize_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertResizeEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertResizeEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the selection_event and log_event_header table.
 *
 */
function insertSelectionEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["start_node_id"] = $event->startNodeId;
    $data["start_node_x_path"] = $event->startNodeXPath;
    $data["s_cursor_position"] = $event->sCursorPosition;
    $data["end_node_id"] = $event->endNodeId;
    $data["end_node_x_path"] = $event->endNodeXPath;
    $data["e_cursor_position"] = $event->eCursorPosition;
    $data["selected_text"] = $event->selectedText;

    $db = Database::obtain();
    $db->insert("selection_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertSelectionEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertSelectionEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the scroll_event and log_event_header table.
 *
 */
function insertScrollEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["offset"] = $event->offset;

    $db = Database::obtain();
    $db->insert("scroll_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertScrollEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertScrollEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the text_event and log_event_header table.
 *
 */
function insertTextEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["cursor_position"] = $event->cursorPosition;
    $data["deleted"] = $event->deleted;
    $data["inserted"] = $event->inserted;

    $db = Database::obtain();
    $db->insert("text_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertTextEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertTextEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the log_event_header table.
 *
 */
function insertLogEventHeader($eventHeader) {
    $data = array();
    $data["id"] = "NULL";
    $data["job_id"] = $eventHeader->jobId;
    $data["file_id"] = $eventHeader->fileId;
    $data["element_id"] = $eventHeader->elementId;
    $data["x_path"] = $eventHeader->xPath;
    $data["time"] = $eventHeader->time;
    $data["type"] = $eventHeader->type;

    $db = Database::obtain();
    $lastInsertId = $db->insert("log_event_header", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertLogEventHeader(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertLogEventHeader(): " . print_r($err, true));
//        return $errno * -1;
    }

//    log::doLog("CASMACAT: insertLogEventHeader(): lastInsertId: '$lastInsertId'");
    return $lastInsertId;
}

/**
 * Inserts an entry into the config_event and log_event_header table.
 *
 */
function insertConfigEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["config"] = json_encode($event->config);

    $db = Database::obtain();
    $db->insert("config_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertConfigEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertConfigEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

/**
 * Inserts an entry into the sr_event and log_event_header table.
 *
 */
function insertSrEvent($event) {
    $headerId = insertLogEventHeader($event);

    $data = array();
    $data["id"] = "NULL";
    $data["header_id"] = $headerId;
    $data["rules"] = json_encode($event->rules);

    $db = Database::obtain();
    $db->insert("sr_event", $data);

    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: insertSrEvent(): " . print_r($err, true));
        throw new Exception("CASMACAT: insertSrEvent(): " . print_r($err, true));
//        return $errno * -1;
    }
}

// just copy+paste and a bit of editing
function getMoreSegmentsWithoutTranslation($jid, $password, $step = 50, $ref_segment, $where = 'after') {
    switch ($where) {
        case 'after':
            $ref_point = $ref_segment;
            break;
        case 'before':
            $ref_point = $ref_segment - ($step + 1);
            break;
        case 'center':
            $ref_point = ((float) $ref_segment) - 100;
            break;
    }

    $query = "select j.id as jid, j.id_project as pid,j.source,j.target, j.last_opened_segment, j.id_translator as tid,
                p.id_customer as cid, j.id_translator as tid,
                p.name as pname, p.create_date , fj.id_file, fj.id_segment_start, fj.id_segment_end,
                f.filename, f.mime_type, s.id as sid, s.segment, s.raw_word_count, s.internal_id,
                'NEW' as status, '' as translation, IF(st.time_to_edit is NULL,0,st.time_to_edit) as time_to_edit, s.xliff_ext_prec_tags,s.xliff_ext_succ_tags

                from jobs j
                inner join projects p on p.id=j.id_project
                inner join files_job fj on fj.id_job=j.id
                inner join files f on f.id=fj.id_file
                inner join segments s on s.id_file=f.id
                left join segment_translations st on st.id_segment=s.id and st.id_job=j.id
                where j.id=$jid and j.password='$password' and s.id > $ref_point and s.show_in_cattool=1
                limit 0,$step
             ";

    $db = Database::obtain();
    $results = $db->fetch_array($query);

    return $results;
}

function getStatsForJobWithoutData($id_job) {

    $query = "select SUM(raw_word_count) as TOTAL, SUM(raw_word_count) as DRAFT, 0 as REJECTED, 0 as TRANSLATED, 0 as APPROVED from jobs j INNER JOIN files_job fj on j.id=fj.id_job INNER join segments s on fj.id_file=s.id_file LEFT join segment_translations st on s.id=st.id_segment WHERE j.id=".$id_job;

    $db = Database::obtain();
    $results = $db->fetch_array($query);

    return $results;
}

function createAndAppendElement($doc, $parent, $name) {
    $tmp = $doc->createElement($name);
    $parent->appendChild($tmp);

    return $tmp;
}

?>
