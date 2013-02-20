<?php

class LogEvent {
    const START_SESSION = "startSession";
    const STOP_SESSION = "stopSession";
    const TEXT = "text";
    const SELECTION = "selection";
    const GAZE = "gaze";
    const FIX = "fix";
    const SCROLL = "scroll";
    const RESIZE = "resize";
    const DRAFTED = "drafted";
    const TRANSLATED = "translated";
    const APPROVED = "approved";
    const REJECTED = "rejected";
    const VIEWPORT_TO_SEGMENT = "viewportToSegment";
    const SOURCE_COPIED = "sourceCopied";
    const SEGMENT_OPENED = "segmentOpened";
    const SEGMENT_CLOSED = "segmentClosed";
    const LOADING_SUGGESTIONS = "loadingSuggestions";
    const SUGGESTIONS_LOADED = "suggestionsLoaded";
    const SUGGESTION_CHOSEN = "suggestionChosen";

    const DECODE = "decode";
    const ALIGNMENTS = "alignments";
    const SUFFIX_CHANGE = "suffixChange";
    const CONFIDENCES = "confidences";
    const TOKENS = "tokens";

    const SHOW_ALIGNMENT_BY_MOUSE = "showAlignmentByMouse";
    const HIDE_ALIGNMENT_BY_MOUSE = "hideAlignmentByMouse";
    const SHOW_ALIGNMENT_BY_KEY = "showAlignmentByKey";
    const HIDE_ALIGNMENT_BY_KEY = "hideAlignmentByKey";

    public $id;
    public $jobId;
    public $fileId;
    public $elementId;
    public $xPath;
    public $time;
    public $type;

    public function __construct($jobId, $fileId, $object) {
        $this->jobId = $jobId;
        $this->fileId = $fileId;

        if (isset($object->id)) {
            $this->id = $object->id;
        }

        $this->elementId = $object->elementId;
        $this->xPath = $object->xPath;
        $this->time = $object->time;
        $this->type = $object->type;

//        log::doLog("CASMACAT: LogEvent->__construct(): Initialized new LogEvent: "
//            . "jobId: '$jobId', fileId: '$fileId'"
//            . "id: '$this->id', elementId: '$this->elementId', xPath: '$this->xPath', "
//            . "time: '$this->time', type: '$this->type'");
    }

    public function resizeData($object) {
        $this->width = $object->width;
        $this->height = $object->height;
    }

    public function textData($object) {
        $this->cursorPosition = $object->cursorPosition;
        $this->deleted = $object->deleted;
        $this->inserted = $object->inserted;
    }

    public function selectionData($object) {
        $this->startNodeId = $object->startNodeId;
        $this->startNodeXPath = $object->startNodeXPath;
        $this->sCursorPosition = $object->sCursorPosition;
        $this->endNodeId = $object->endNodeId;
        $this->endNodeXPath = $object->endNodeXPath;
        $this->eCursorPosition = $object->eCursorPosition;
        $this->selectedText = $object->selectedText;
    }

    public function scrollData($object) {
        $this->offset = $object->offset;
    }

    public function eyeData($object) {
        $this->tTime = $object->tTime;
        $this->eyeX = $object->eyeX;
        $this->eyeY = $object->eyeY;
        $this->character = $object->character;
        $this->characterOffset = $object->characterOffset;
    }

    public function eyeGazeData($object) {
        $this->pupilDilation = $object->pupilDilation;
    }

    public function eyeFixData($object) {
        $this->duration = $object->duration;
    }

    public function segmentChangedData($object) {
        $this->newSegment = $object->newSegment;
    }

    public function suggestionsLoadedData($object) {
        $this->matches = $object->matches;
    }

    public function suggestionChosenData($object) {
        $this->which = $object->which;
        $this->translation = $object->translation;
    }

    public function itpData($object) {
        $this->data = $object->data;
    }

    public function toString() {
        return print_r($this, true);
    }
}

?>
