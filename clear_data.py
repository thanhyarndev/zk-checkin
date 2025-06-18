#!/usr/bin/env python3
"""
Clear all data from the database
"""

import sqlite3
import os

def clear_data():
    """Clear all data from the database"""
    
    print("=== Clear Database Data ===")
    
    if not os.path.exists('checkins.db'):
        print("❌ Database file 'checkins.db' not found!")
        return False
    
    try:
        # Remove the database file completely
        os.remove('checkins.db')
        print("✅ Deleted existing database")
        
        # Create new database with correct schema
        conn = sqlite3.connect('checkins.db')
        conn.execute(
            "CREATE TABLE IF NOT EXISTS checkins ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "epc TEXT NOT NULL, "
            "employee_name TEXT NOT NULL, "
            "timestamp DATETIME NOT NULL, "
            "check_type TEXT DEFAULT 'checkin')"
        )
        conn.commit()
        conn.close()
        
        print("✅ Created new empty database")
        print("✅ All data cleared successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = clear_data()
    if success:
        print("\n🎉 Database cleared! You can now run 'python app.py' to start fresh.")
    else:
        print("\n💥 Failed to clear database.") 