use matecat_sandbox;

CREATE TABLE `log_event_header` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `job_id` int(11) NOT NULL COMMENT 'Reference to job table',
  `file_id` int(11) NOT NULL COMMENT 'Reference to file table',
  `element_id` varchar(256) NOT NULL COMMENT 'The HTML id of the element, if any',
  `x_path` varchar(256) NOT NULL COMMENT 'Absolute or relative XPath to the element',
  `time` varchar(20) NOT NULL COMMENT 'Time in ms of the event',
  `type` varchar(45) NOT NULL COMMENT 'Type of the event',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores the header information of all log events.';

CREATE TABLE `text_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `cursor_position` int(5) NOT NULL COMMENT 'Cursor position where the change occured',
  `deleted` text NOT NULL COMMENT 'Deleted text, if any',
  `inserted` text NOT NULL COMMENT 'Inserted text, if any',
  `previous` varchar(500) NOT NULL COMMENT 'Previous full target text',
  `text` varchar(500) NOT NULL COMMENT 'Full target text',
  `edition` varchar(45) NOT NULL COMMENT 'Type of edition',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores text changed events.';

CREATE TABLE `scroll_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header',
  `offset` int(11) NOT NULL COMMENT 'Offset of the scrollbar',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores scrollbar events.';

CREATE TABLE `selection_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `start_node_id` varchar(256) NOT NULL COMMENT 'Id of the starting node of the selection',
  `start_node_x_path` varchar(256) NOT NULL COMMENT 'XPath of the starting node of the selection',
  `s_cursor_position` int(5) NOT NULL COMMENT 'Selection start cursor position relative to the start node',
  `end_node_id` varchar(256) NOT NULL COMMENT 'Id of the ending node of the selection',
  `end_node_x_path` varchar(256) NOT NULL COMMENT 'XPath of the ending node of the selection',
  `e_cursor_position` int(5) NOT NULL COMMENT 'Selection end cursor position relative to the end node',
  `selected_text` text NOT NULL COMMENT 'Text that has been selected',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores selection ranges.';

CREATE TABLE `resize_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `width` int(5) NOT NULL COMMENT 'The new width',
  `height` int(5) NOT NULL COMMENT 'The new height',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores resize events (of the browser window).';

CREATE TABLE `suggestion_chosen_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `which` varchar(2) NOT NULL COMMENT 'Stores the index of the translation chosen',
  `translation` text NOT NULL COMMENT 'Stores the translation chosen',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores choice of a suggestions.';

CREATE TABLE `suggestions_loaded_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `matches` text NOT NULL COMMENT 'Stores all the matches found',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores successful load of suggestion array.';

CREATE TABLE IF NOT EXISTS `itp_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `data` text NOT NULL COMMENT 'Stores all the data found',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='Stores ITP events.';

CREATE TABLE `key_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `cursor_position` int(5) NOT NULL COMMENT 'Cursor position where the key event occured',
  `which` varchar(5) NOT NULL COMMENT 'The javascript keycode',
  `mapped_key` varchar(20) NOT NULL COMMENT 'The key mapped to the code of which',
  `shift` tinyint(1) NOT NULL COMMENT 'Was the shift key pressed in addition?',
  `ctrl` tinyint(1) NOT NULL COMMENT 'Was the ctrl key pressed in addition?',
  `alt` tinyint(1) NOT NULL COMMENT 'Was the alt key pressed in addition?',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores key (down/up) events.';

CREATE VIEW v_files_jobs AS
SELECT f.id, f.id_project, f.filename, f.source_language, fj.id_job, j.password
FROM files f, files_job fj, jobs j
WHERE fj.id_file = f.id
AND fj.id_job = f.id_project
AND j.id = fj.id_job;

CREATE TABLE `mouse_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `which` varchar(1) NOT NULL COMMENT 'The button (1 for the left button, 2 for the middle button, or 3 for the right button)',
  `x` int(5) NOT NULL COMMENT 'clientX (relative to window)',
  `y` int(5) NOT NULL COMMENT 'clientY (relative to window)',
  `shift` tinyint(1) NOT NULL COMMENT 'Was the shift key pressed in addition?',
  `ctrl` tinyint(1) NOT NULL COMMENT 'Was the ctrl key pressed in addition?',
  `alt` tinyint(1) NOT NULL COMMENT 'Was the alt key pressed in addition?',
  `cursor_position` int(5) NOT NULL COMMENT 'Cursor position where the mouse event occured (if available)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores mouse (down/click/move) events.';

CREATE TABLE `fixation_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `t_time` varchar(20) NOT NULL COMMENT 'Time submitted by the eye tracker',
  `x` int(5) NOT NULL COMMENT 'x coordinate of fixation (relative to window)',
  `y` int(5) NOT NULL COMMENT 'y coordinate of fixation (relative to window)',
  `duration` VARCHAR(20) NOT NULL COMMENT 'Duration of the fixation',
  `character` VARCHAR(4) NOT NULL COMMENT 'The character fixated',
  `offset` INT(5) NOT NULL COMMENT 'The offset of the character within the HTML element',
  `above_char` VARCHAR(4) NOT NULL COMMENT 'The character above the fixation',
  `below_char` VARCHAR(4) NOT NULL COMMENT 'The character below the fixation',
  `above_offset` INT(5) NOT NULL COMMENT 'The offset of the character above the fixation within the HTML element',  
  `below_offset` INT(5) NOT NULL COMMENT 'The offset of the character below the fixation within the HTML element',
  `gold_offset` INT(5) NOT NULL COMMENT 'The corrected offset of fixation',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores fixation events.';

CREATE TABLE `gaze_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `t_time` varchar(20) NOT NULL COMMENT 'Time submitted by the eye tracker',
  `lx` int(5) NOT NULL COMMENT 'x coordinate of the left eye (relative to window)',
  `ly` int(5) NOT NULL COMMENT 'y coordinate of the left eye (relative to window)',
  `rx` int(5) NOT NULL COMMENT 'x coordinate of the right eye (relative to window)',
  `ry` int(5) NOT NULL COMMENT 'y coordinate of the right eye (relative to window)',
  `l_dil` varchar(10) NOT NULL COMMENT 'Dilation of the left eye',
  `r_dil` varchar(10) NOT NULL COMMENT 'Dilation of the right eye',
  `l_char` VARCHAR(4) NOT NULL COMMENT 'The character gazed by the left eye',
  `l_offset` INT(5) NOT NULL COMMENT 'The offset of the character within the HTML element',
  `r_char` VARCHAR(4) NOT NULL COMMENT 'The character gazed by the right eye',
  `r_offset` INT(5) NOT NULL COMMENT 'The offset of the character within the HTML element',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores gaze events.';

CREATE TABLE `stats_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `stats` text NOT NULL COMMENT 'Stores the stastic (progress/status) information',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores stastic (progress/status) information.';

CREATE TABLE `deleting_suggestion_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `which` varchar(2) NOT NULL COMMENT 'Stores the index of the suggestion deleted',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores deletion of a suggestions.';

CREATE TABLE `config_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `config` text NOT NULL COMMENT 'JSON array of UI config used',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores configuration change events.';

CREATE TABLE `sr_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `rules` text NOT NULL COMMENT 'JSON array of rules set for sr',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores sr rules events.';

CREATE TABLE IF NOT EXISTS `biconcor_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `header_id` int(11) NOT NULL,
  `word` varchar(15) COLLATE utf8_unicode_ci NOT NULL,
  `info` text COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id` (`id`),
  KEY `header_id` (`header_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=28 ;

CREATE TABLE IF NOT EXISTS `float_prediction_show_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `header_id` int(11) NOT NULL,
  `text` text COLLATE utf8_unicode_ci NOT NULL,
  `visible` tinyint(1) COLLATE utf8_unicode_ci NOT NULL,
  `x` varchar(8) COLLATE utf8_unicode_ci NOT NULL,
  `y` varchar(8) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id` (`id`),
  KEY `header_id` (`header_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=28 ;

CREATE TABLE IF NOT EXISTS `itp_server_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `header_id` int(11) NOT NULL,
  `type` char(6) NOT NULL COMMENT 'Emit or Result ',
  `request` varchar(45) NOT NULL COMMENT 'Name of the request',
  `data` text COLLATE utf8_unicode_ci,
  `error` text COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `id` (`id`),
  KEY `header_id` (`header_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=28 ;

CREATE TABLE IF NOT EXISTS `epen_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `header_id` int(11) NOT NULL,
  `info` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=8 ;

ALTER TABLE config_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE deleting_suggestion_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE fixation_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE gaze_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE itp_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE key_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE mouse_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE resize_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE scroll_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE selection_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE sr_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE stats_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE suggestions_loaded_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE suggestion_chosen_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE text_event ADD FOREIGN KEY (header_id) REFERENCES log_event_header(id) ON UPDATE CASCADE ON DELETE CASCADE;
