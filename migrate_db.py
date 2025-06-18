#!/usr/bin/env python3
"""
Database migration script
This script will update the existing database to include the check_type column
"""

import sqlite3
import os

def migrate_database():
    """Migrate the existing database to include check_type column"""
    
    print("=== Database Migration Tool ===")
    
    if not os.path.exists('checkins.db'):
        print("❌ Database file 'checkins.db' not found!")
        print("Please run the application first to create the database.")
        return False
    
    try:
        conn = sqlite3.connect('checkins.db')
        
        # Check if check_type column already exists
        cursor = conn.execute("PRAGMA table_info(checkins)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'check_type' in columns:
            print("✅ Database already has check_type column. No migration needed.")
            conn.close()
            return True
        
        print("🔄 Migrating database...")
        
        # Add check_type column with default value 'checkin'
        conn.execute("ALTER TABLE checkins ADD COLUMN check_type TEXT DEFAULT 'checkin'")
        
        # Update existing records to have check_type = 'checkin'
        conn.execute("UPDATE checkins SET check_type = 'checkin' WHERE check_type IS NULL")
        
        conn.commit()
        conn.close()
        
        print("✅ Database migration completed successfully!")
        print("✅ Added check_type column to existing records")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("\n🎉 You can now run 'python app.py' to start the application.")
    else:
        print("\n💥 Migration failed. Please check the error messages above.") 