import sqlite3
import os

db_path = './data/campus_assistant.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Issues table
    cols = [c[1] for c in cursor.execute('PRAGMA table_info(issues)').fetchall()]
    if 'user_type' not in cols:
        cursor.execute("ALTER TABLE issues ADD COLUMN user_type TEXT DEFAULT 'student'")
    if 'user_email' not in cols:
        cursor.execute("ALTER TABLE issues ADD COLUMN user_email TEXT")
    if 'user_phone' not in cols:
        cursor.execute("ALTER TABLE issues ADD COLUMN user_phone TEXT")
    if 'resolved_at' not in cols:
        cursor.execute("ALTER TABLE issues ADD COLUMN resolved_at TIMESTAMP")
        
    # Chat history table
    cols_chat = [c[1] for c in cursor.execute('PRAGMA table_info(chat_history)').fetchall()]
    if 'user_name' not in cols_chat:
        cursor.execute("ALTER TABLE chat_history ADD COLUMN user_name TEXT")
    if 'user_type' not in cols_chat:
        cursor.execute("ALTER TABLE chat_history ADD COLUMN user_type TEXT DEFAULT 'student'")
        
    # Users table
    cols_users = [c[1] for c in cursor.execute('PRAGMA table_info(users)').fetchall()]
    if 'email' not in cols_users:
        cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
        
    conn.commit()
    conn.close()
    print("Database schema successfully upgraded with user_type, email, and resolved_at fields.")
else:
    print("Database file does not exist yet. Will be created with new schema on startup.")

