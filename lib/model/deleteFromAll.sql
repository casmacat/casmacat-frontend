
--DELETE FROM `engines` WHERE 1;
--INSERT INTO `engines` VALUES (1,'MyMemory (All Pairs)','TM','MyMemory: next generation Translation Memory technology','http://mymemory.translated.net/api','get','set','delete',NULL,'1',0),(2,'FBK-IT (EN->IT)','MT','FBK (EN->IT) Moses Information Technology engine','http://hlt-services2.fbk.eu:8480','translate',NULL,NULL,NULL,'2',14),(3,'LIUM-IT (EN->DE)','MT','Lium (EN->FR) Moses Information Technology engine','http://193.52.29.66:8001','translate',NULL,NULL,NULL,'2',14),(4,'FBK-LEGAL (EN>IT)','MT','FBK (EN->IT) Moses Legal engine','http://hlt-services2.fbk.eu:8490','translate',NULL,NULL,NULL,'2',14),(5,'LIUM-LEGAL (EN->DE)','MT','Lium (EN->FR) Moses Legal engine','http://193.52.29.66:8001','translate',NULL,NULL,NULL,NULL,14);
DELETE FROM `log_event_header` WHERE 1;
DELETE FROM `biconcor_event` WHERE 1;
DELETE FROM `float_prediction_show_event` WHERE 1;
DELETE FROM `itp_server_event` WHERE 1;
DELETE FROM `config_event` WHERE 1;
DELETE FROM `deleting_suggestion_event` WHERE 1;
DELETE FROM `epen_event` WHERE 1;
DELETE FROM `files` WHERE 1;
DELETE FROM `files_job` WHERE 1;
DELETE FROM `fixation_event` WHERE 1;
DELETE FROM `gaze_event` WHERE 1;
DELETE FROM `itp_event` WHERE 1;
DELETE FROM `jobs` WHERE 1;
DELETE FROM `key_event` WHERE 1;
DELETE FROM `mouse_event` WHERE 1;
DELETE FROM `notifications` WHERE 1;
DELETE FROM `projects` WHERE 1;
DELETE FROM `resize_event` WHERE 1;
DELETE FROM `scroll_event` WHERE 1;
DELETE FROM `segments` WHERE 1;
DELETE FROM `segments_comments` WHERE 1;
DELETE FROM `segment_translations` WHERE 1;
DELETE FROM `selection_event` WHERE 1;
DELETE FROM `sr_event` WHERE 1;
DELETE FROM `stats_event` WHERE 1;
DELETE FROM `suggestions_loaded_event` WHERE 1;
DELETE FROM `suggestion_chosen_event` WHERE 1;
DELETE FROM `text_event` WHERE 1;
DELETE FROM `translators` WHERE 1;


