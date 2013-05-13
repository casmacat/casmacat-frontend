#! /usr/bin/env python

import sys, MySQLdb

n_expected_args = 1
n_received_args = len(sys.argv[1:])

if (n_received_args < n_expected_args):
  sys.exit("Usage: %s all|events" % sys.argv[0])

table_type = sys.argv[1]

cnx = MySQLdb.connect("localhost", "root", "4dm!n", "matecat")
cur = cnx.cursor()

event_tables   = ("itp_event", "key_event", "log_event_header", "scroll_event", "selection_event", " suggestions_loaded_event", "suggestion_chosen_event", " text_event")
cleanup_tables = ("files", "files_job", "jobs", "notifications", "projects", "resize_event",  "segments", "segments_comments", "segment_translations ", "translators")

if table_type == "events":
  task_tables = event_tables

if table_type == "all":
  task_tables = event_tables + cleanup_tables

#print "Truncating %d tables: %s ..." % (len(task_tables), ", ".join(task_tables))
print "Truncating %d tables..." % len(task_tables)

for table in task_tables:
  cur.execute("TRUNCATE TABLE %s" % table)

cur.close()

print "Done."
