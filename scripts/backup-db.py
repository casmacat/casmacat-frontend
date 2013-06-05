#! /usr/bin/env python

import sys, MySQLdb
import ConfigParser, os, time

n_expected_args = 0
n_received_args = len(sys.argv[1:])

if (n_received_args > n_expected_args):
  sys.exit("Usage: %s" % sys.argv[0])

timestamp = time.strftime('%Y%m%d_%H%M%S')
base_dir = '/var/www/matecat-test'
base_new = raw_input('Base dir set to `%s`. Enter new path, if need be: ' % base_dir)
if os.path.exists(base_new):
  base_dir = base_new

print "Setting base dir: `%s` ..." % base_dir

ini_file = base_dir + '/inc/config.ini'
config = ConfigParser.ConfigParser()
config.readfp(open(ini_file))
hostname = config.get('db', 'hostname').strip('"')
username = config.get('db', 'username').strip('"')
password = config.get('db', 'password').strip('"')
database = config.get('db', 'database').strip('"')

database_new = "bak_" + database + "_" + timestamp

try:
  cnx = MySQLdb.connect(hostname, username, password, database)
except MySQLdb.OperationalError, e:
  sys.exit("Error: %s" % e)

print "Making backup ..."
if not os.path.exists("%s/mysql-backup" % base_dir):
  os.mkdir("%s/mysql-backup" % base_dir)
filename  = "%s/mysql-backup/%s-%s.sql" % (base_dir, database, timestamp)
mysql_credentials = "--user='%s' --password='%s' --host='%s' " % (username, password, hostname)
res = os.system("mysqldump %s -e --opt -c '%s' | gzip -c > %s.gz" % (mysql_credentials, database, filename))
if res != 0: raise Exception("error %d" % res)

print "Renaming database to `%s` ..." % database_new
cur = cnx.cursor()
# mysqldump -h [server] -u [user] -p[password] db1 | mysql -h [server] -u [user] -p[password] db2
cur.execute("CREATE DATABASE %s" % (database_new))
res = os.system("mysqldump %s '%s' | mysql %s '%s'" % (mysql_credentials, database, mysql_credentials, database_new))
if res != 0: raise Exception("error %d" % res)
cur.execute("DROP DATABASE %s" % (database))
cur.close()

print "Creating new tables ..."
model_file_matecat  = base_dir + '/lib/model/matecat.sql'
model_file_casmacat = base_dir + '/lib/model/casmacat.sql'
res = os.system("mysql %s < '%s'" % (mysql_credentials, model_file_matecat))
if res != 0: raise Exception("error %d" % res)
res = os.system("mysql %s < '%s'" % (mysql_credentials, model_file_casmacat))
if res != 0: raise Exception("error %d" % res)

print "Done."
print 
