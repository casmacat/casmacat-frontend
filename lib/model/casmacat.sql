use matecat_sandbox;


delimiter $$

CREATE TABLE `log_event_header` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `job_id` int(11) NOT NULL COMMENT 'Reference to job table',
  `file_id` int(11) NOT NULL COMMENT 'Reference to file table',
  `element_id` varchar(256) NOT NULL COMMENT 'The HTML id of the element, if any',
  `x_path` varchar(256) NOT NULL COMMENT 'Absolute or relative XPath to the element',
  `time` varchar(20) NOT NULL COMMENT 'Time in ms of the event',
  `type` varchar(45) NOT NULL COMMENT 'Type of the event',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores the header information of all log events.'$$

delimiter $$

CREATE TABLE `text_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `cursor_position` int(5) NOT NULL COMMENT 'Cursor position where the change occured',
  `deleted` text NOT NULL COMMENT 'Deleted text, if any',
  `inserted` text NOT NULL COMMENT 'Inserted text, if any',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores text changed events.'$$

delimiter $$

CREATE TABLE `scroll_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header',
  `offset` int(11) NOT NULL COMMENT 'Offset of the scrollbar',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores scrollbar events.'$$

delimiter $$

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores selection ranges.'$$

delimiter $$

CREATE TABLE `resize_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `width` int(5) NOT NULL COMMENT 'The new width',
  `height` int(5) NOT NULL COMMENT 'The new height',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores resize events (of the browser window).'$$

delimiter $$

CREATE TABLE `suggestion_chosen_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `which` varchar(2) NOT NULL COMMENT 'Stores the index of the translation chosen',
  `translation` text NOT NULL COMMENT 'Stores the translation chosen',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores segment changes.'$$

delimiter $$

CREATE TABLE `suggestions_loaded_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `matches` text NOT NULL COMMENT 'Stores all the matches found',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Stores suggestion changes.'$$

delimiter $$

CREATE TABLE IF NOT EXISTS `itp_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `data` text NOT NULL COMMENT 'Stores all the data found',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='Stores ITP events.'$$

delimiter $$

CREATE TABLE `key_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `header_id` int(11) NOT NULL COMMENT 'Reference to log_event_header table',
  `cursor_position` int(5) NOT NULL COMMENT 'Cursor position where the key event occured',
  `which` varchar(5) NOT NULL COMMENT 'The javascript keycode',
  `character` varchar(20) NOT NULL COMMENT 'The character or key mapped to the code of which',
  `shift` bit(1) NOT NULL COMMENT 'Was the shift key pressed in addition?',
  `ctrl` bit(1) NOT NULL COMMENT 'Was the ctrl key pressed in addition?',
  `alt` bit(1) NOT NULL COMMENT 'Was the alt key pressed in addition?',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2440 DEFAULT CHARSET=utf8 COMMENT='Stores key (down/up) events.'$$

CREATE VIEW v_files_jobs AS
SELECT f.id, f.id_project, f.filename, f.source_language, fj.id_job, j.password
FROM files f, files_job fj, jobs j
WHERE fj.id_file = f.id
AND fj.id_job = f.id_project
AND j.id = fj.id_job$$
