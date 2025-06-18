#!/usr/bin/env python3
"""
Reset database script
This script will clear all check-in records and recreate the database structure
"""

import sqlite3
import os

def reset_database():
    """Reset the check-ins database"""
    
    print("=== Database Reset Tool ===")
    
    # Check if database exists
    if os.path.exists('checkins.db'):
        print("Found existing database: checkins.db")
        response = input("Do you want to delete all records and reset? (y/N): ")
        
        if response.lower() != 'y':
            print("Reset cancelled.")
            return
    
    # Remove existing database
    if os.path.exists('checkins.db'):
        os.remove('checkins.db')
        print("✅ Deleted existing database")
    
    # Create new database with updated schema
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
    
    print("✅ Created new database with updated schema")
    print("✅ Database reset complete!")
    print("\nYou can now run 'python app.py' to start the application.")

if __name__ == "__main__":
    reset_database() 