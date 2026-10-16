# EduSphere LMS — Database Backup & Disaster Recovery Guide

This document describes the automated daily backup procedure, retention lifecycle, and disaster recovery restore testing for the EduSphere LMS database.

---

## 1. Automated Daily Backup

The backup engine is located at [server/scripts/backup_db.py](file:///c:/EduSphere/server/scripts/backup_db.py). It automatically detects the active database engine from `DATABASE_URL` (`PostgreSQL` in production, `SQLite` in development).

### Key Features
- **Atomic Snapshots**: Uses PostgreSQL `pg_dump` with gzip compression or the `sqlite3` online backup API (locks-safe, zero query disruption).
- **Automated Pruning**: Retains backups for **7 days** by default, automatically deleting expired archives.
- **Integrity Validation**: Verifies headers and table counts immediately post-dump.

---

## 2. CLI Commands

### Create Immediate Backup
```bash
python server/scripts/backup_db.py --backup
```

### List Available Backups
```bash
python server/scripts/backup_db.py --list
```

### Test Restore & Integrity
```bash
python server/scripts/backup_db.py --test-restore
```

---

## 3. Disaster Recovery & Restore Instructions

### For Production (PostgreSQL)
To restore a `.sql.gz` backup into PostgreSQL:

1. **Verify the archive**:
   ```bash
   gzip -t server/storage/backups/edusphere_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

2. **Restore into target database**:
   ```bash
   gunzip -c server/storage/backups/edusphere_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U postgres -d edusphere
   ```

3. **Verify table count and migrations**:
   ```bash
   psql -U postgres -d edusphere -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
   ```

### For Development (SQLite)
To restore a `.db` backup file:
```bash
# 1. Stop server process
# 2. Copy the verified snapshot to active database location:
cp server/storage/backups/edusphere_backup_YYYYMMDD_HHMMSS.db server/edusphere.db
# 3. Verify integrity
python -c "import sqlite3; con = sqlite3.connect('server/edusphere.db'); print(con.execute('PRAGMA integrity_check;').fetchall())"
```

---

## 4. Automation Scheduling

### Linux / Render / Docker (Cron)
Run daily at 02:00 UTC:
```cron
0 2 * * * cd /app && python server/scripts/backup_db.py --backup >> /var/log/edusphere_backup.log 2>&1
```

### Windows (Task Scheduler)
```powershell
schtasks /create /tn "EduSphere_Daily_Backup" /tr "python c:\EduSphere\server\scripts\backup_db.py --backup" /sc daily /st 02:00
```
