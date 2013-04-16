<?php

class LogEvent {
    const START_SESSION = "startSession";
    const STOP_SESSION = "stopSession";
    const TEXT = "text";
    const SELECTION = "selection";
    const GAZE = "gaze";
    const FIXATION = "fixation";
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

    const KEY_DOWN = "keyDown";
    const KEY_UP = "keyUp";

    const MOUSE_DOWN = "mouseDown";
    const MOUSE_UP = "mouseUp";
    const MOUSE_CLICK = "mouseClick";
    const MOUSE_MOVE = "mouseMove";

    const BEFORE_CUT = "beforeCut";
    const BEFORE_COPY = "beforeCopy";
    const BEFORE_PASTE = "beforePaste";

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

    public function gazeData($object) {
        $this->tTime = $object->tTime;
        $this->lx = $object->lx;
        $this->ly = $object->ly;
        $this->rx = $object->rx;
        $this->ry = $object->ry;
        $this->lDil = $object->lDil;
        $this->rDil = $object->rDil;
        $this->lChar = $object->lChar;
        $this->lOffset = $object->lOffset;
        $this->rChar = $object->rChar;
        $this->rOffset = $object->rOffset;
    }

    public function fixationData($object) {
        $this->tTime = $object->tTime;
        $this->x = $object->x;
        $this->y = $object->y;
        $this->duration = $object->duration;
        $this->character = $object->character;
        $this->offset = $object->offset;
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

    public function keyData($object) {
        $this->cursorPosition = $object->cursorPosition;
        $this->which = $object->which;
        //$this->character = $object->character;
        $this->mappedKey = $object->mappedKey;
        $this->shift = $object->shift;
        $this->ctrl = $object->ctrl;
        $this->alt = $object->alt;
    }

    public function mouseData($object) {
        $this->which = $object->which;
        $this->x = $object->x;
        $this->y = $object->y;
        $this->shift = $object->shift;
        $this->ctrl = $object->ctrl;
        $this->alt = $object->alt;
        $this->cursorPosition = $object->cursorPosition;
    }

    public function toString() {
        return print_r($this, true);
    }
}

?>
