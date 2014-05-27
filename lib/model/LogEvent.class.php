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
    const DELETING_SUGGESTION = "deletingSuggestion";
    const SUGGESTION_DELETED = "suggestionDeleted";
    const STATS_UPDATED = "statsUpdated";

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

    const VIS_MENU_DISPLAYED = "visMenuDisplayed";
    const VIS_MENU_HIDDEN = "visMenuHidden";
    const INITIAL_CONFIG = "initialConfig";
    const CONFIG_CHANGED = "configChanged";
    const MOUSE_WHEEL_UP = "mouseWheelUp";
    const MOUSE_WHEEL_DOWN = "mouseWheelDown";
    const MOUSE_WHEEL_INVALIDATE = "mouseWheelInvalidate";
    const MEMENTO_UNDO = "mementoUndo";
    const MEMENTO_REDO = "mementoRedo";
    const MEMENTO_INVALIDATE = "mementoInvalidate";

    const SR_MENU_DISPLAYED = "srMenuDisplayed";
    const SR_MENU_HIDDEN = "srMenuHidden";
    const SR_MATCH_CASE_ON = "srMatchCaseOn";
    const SR_MATCH_CASE_OFF = "srMatchCaseOff";
    const SR_REG_EXP_ON = "srRegExpOn";
    const SR_REG_EXP_OFF = "srRegExpOff";
    const SR_RULES_SETTING = "srRulesSetting";
    const SR_RULES_SET = "srRulesSet";
    const SR_RULES_APPLIED = "srRulesApplied";
    const SR_RULE_DELETED = "srRuleDeleted";
    
    // merc - adding floatprediction, biconcor and translationOption
    const FLOAT_PREDICTION = "floatPrediction";
    const BICONCOR = "biconcor";
    const TRANSLATION_OPTION = "TranslationOption";
    
    // merc - adding e-pen
//    const GESTURE = "gesture";
    const EPEN_OPENED = "epenOpened";
    const EPEN_CLOSED = "epenClosed";
    // merc - blur/focus
    const BLUR = "blur";
    const FOCUS = "focus";

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
        //log::doLog("object: ", print_r($object, true));
        if (isset($object->cp)) {
            $this->cursorPosition = $object->cp;
            $this->deleted = $object->d;
            $this->inserted = $object->i;
            $this->previous = $object->p;
            $this->text = $object->t;
            $this->edition = $object->e;
        }
        else {
            $this->cursorPosition = $object->cursorPosition;
            $this->deleted = $object->deleted;
            $this->inserted = $object->inserted;
            $this->previous = $object->previous;
            $this->text = $object->text;
            $this->edition = $object->edition;
        }
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
        if (isset($object->tt)) {
            $this->tTime = $object->tt;
            $this->lx = $object->lx;
            $this->ly = $object->ly;
            $this->rx = $object->rx;
            $this->ry = $object->ry;
            $this->lDil = $object->ld;
            $this->rDil = $object->rd;
            $this->lChar = $object->lc;
            $this->lOffset = $object->lo;
            $this->rChar = $object->rc;
            $this->rOffset = $object->ro;
        }
        else {
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
    }

    public function fixationData($object) {
        if (isset($object->tt)) {
            $this->tTime = $object->tt;
            $this->x = $object->x;
            $this->y = $object->y;
            $this->duration = $object->d;
            $this->character = $object->c;
            $this->offset = $object->o;
            $this->aboveChar = $object->a;       //dan
            $this->aboveOffset = $object->ao; //dan
            $this->belowChar = $object->b;     //dan
            $this->belowOffset = $object->bo; //dan
            
        }
        else {
            $this->tTime = $object->tTime;
            $this->x = $object->x;
            $this->y = $object->y;
            $this->duration = $object->duration;
            $this->character = $object->character;
            $this->offset = $object->offset;
            $this->aboveChar = $object->aboveChar;       //dan
            $this->aboveOffset = $object->aboveOffset; //dan
            $this->belowChar = $object->belowChar;     //dan
            $this->belowOffset = $object->belowOffset; //dan
            $this->goldOffset = $object->goldOffset; //dan
        }
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

    public function deletingSuggestionData($object) {
        $this->which = $object->which;
    }

    public function statsUpdatedData($object) {
        $this->stats = $object->stats;
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

    public function configData($object) {
        $this->config = $object->config;
    }

    public function srRulesSetData($object) {
        $this->rules = $object->rules;
    }
    
    // merc - adding biconcor
    public function biconcorData($object) {
        $this->word = $object->word;
        $this->info = $object->info;
    }
    
    // merc - adding epen
    public function epenData($object) {
        log::doLog("TEST3: ".print_r($object,true));
        $this->info = $object->info;
    }
    
    public function toString() {
        return print_r($this, true);
    }
}

?>
