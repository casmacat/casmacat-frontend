<?php
include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";

/**
 * Contains all CASMACAT related database queries.
 */

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
                // TODO
                break;
            case LogEvent::FIX:
                // TODO
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

//    include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";

    $db = Database::obtain();
    $queryId = $db->query("SELECT * FROM log_event_header h WHERE h.job_id = '$jobId' AND h.file_id = '$fileId'"
            . " ORDER BY h.time ASC LIMIT $startOffset, $endOffset");

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
            case LogEvent::GAZE:
                // TODO
                break;
            case LogEvent::FIX:
                // TODO
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

            default:
                log::doLog("CASMACAT: fetchLogChunk(): Unknown log event type: '$logEvent->type', header id: '$logEvent->id'");
                throw new Exception("CASMACAT: fetchLogChunk(): Unknown log event type: '$logEvent->type', header id: '$logEvent->id'");
//                return -1;
        }

        $logListChunk[] = $logEvent;
//        log::doLog("CASMACAT: fetchLogChunk(): Loaded: '" . $logEvent->toString() . "'");
    }

    return $logListChunk;
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
// TODO add some caching to speed up
function snakeToCamel($row) {
//    log::doLog("CASMACAT: snakeToCamel(): camel case row: " . print_r($row, true));

    foreach ($row as $key => $value) {
        // taken from: http://www.refreshinglyblue.com/2009/03/20/php-snake-case-to-camel-case/
        $s = str_replace(' ', '', ucwords(str_replace('_', ' ', $key)));
        $s = strtolower(substr($s, 0, 1)).substr($s, 1);

        // reorganize the array
        if ($s != $key) {
            $row[$s] = $value;
            unset($row[$key]);
        }
    }

    return (object)$row;
//    log::doLog("CASMACAT: snakeTCoCamel(): camel case row: " . print_r($row, true));
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
    $data["character"] = $event->character;
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
                'NEW' as status, IF(st.time_to_edit is NULL,0,st.time_to_edit) as time_to_edit, s.xliff_ext_prec_tags,s.xliff_ext_succ_tags

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

function createAndAppendElement($doc, $parent, $name) {
    $tmp = $doc->createElement($name);
    $parent->appendChild($tmp);

    return $tmp;
}

?>
