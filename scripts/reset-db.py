#! /usr/bin/env python

#
# Note: This script resets *all* database tables. Consider using `backup-db.py` instead.
#

import sys, MySQLdb

n_expected_args = 1
n_received_args = len(sys.argv[1:])

if (n_received_args < n_expected_args):
  sys.exit("Usage: %s all|events" % sys.argv[0])

table_type = sys.argv[1]

base_dir = '/home/demo/public_html/cat/matecat-test'
base_new = raw_input('Base dir set to `%s`. Enter new path, if need be: ' % base_dir)
if os.path.exists(base_new):
  base_dir = base_new

ini_file = base_dir + '/inc/config.ini'
config = ConfigParser.ConfigParser()
config.readfp(open(ini_file))
hostname = config.get('db', 'hostname').strip('"')
username = config.get('db', 'username').strip('"')
password = config.get('db', 'password').strip('"')
database = config.get('db', 'database').strip('"')

cnx = MySQLdb.connect(hostname, username, password, database)
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
