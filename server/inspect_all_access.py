import pyodbc
import os
from config import settings

print("=== INSPECTING ALL TABLES AND COLUMNS IN ALL 7 ACCESS ACCDB FILES ===")

databases = {
    "academic": "AcademicDB.accdb",
    "attendance": "AttendanceDB.accdb",
    "faculty": "FacultyDB.accdb",
    "resource": "ResourceDB.accdb",
    "subject": "Subject&Course.accdb",
    "timetable": "TimeTableDB.accdb",
    "lms_main": "ERP_Main.accdb",
}

for key, fname in databases.items():
    fpath = os.path.join(settings.ACCESS_DB_DIR, fname)
    print(f"\n--- Database: {fname} ---")
    if not os.path.exists(fpath):
        print("  File not found!")
        continue
    
    conn_str = r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" + fpath + ";"
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Get tables
        tables = [row.table_name for row in cursor.tables(tableType='TABLE')]
        print(f"  Tables found ({len(tables)}):", tables)
        
        for t in tables:
            try:
                cursor.execute(f"SELECT TOP 3 * FROM [{t}]")
                columns = [column[0] for column in cursor.description]
                rows = cursor.fetchall()
                print(f"    Table [{t}] ({len(rows)} sample rows): Columns = {columns}")
                for r in rows:
                    print(f"       -> {dict(zip(columns, r))}")
            except Exception as te:
                print(f"    Table [{t}] error: {te}")
                
        conn.close()
    except Exception as e:
        print(f"  Connection error: {e}")
