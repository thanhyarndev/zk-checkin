#!/usr/bin/env python3
"""
Reset database script for RFID Check-in System
This script will drop all tables and recreate them with the new schema
"""

import sqlite3
import os
from datetime import datetime

def reset_database():
    """Reset the database with new schema"""
    
    # Remove existing database file
    if os.path.exists('checkins.db'):
        os.remove('checkins.db')
        print("✅ Removed existing database file")
    
    # Create new database connection
    conn = sqlite3.connect('checkins.db')
    
    print("🔄 Creating new database schema...")
    
    # Employees table
    conn.execute('''
        CREATE TABLE employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            employee_code TEXT UNIQUE,
            department TEXT,
            position TEXT,
            email TEXT,
            phone TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("✅ Created employees table")
    
    # Employee tags table (1 employee can have multiple tags)
    conn.execute('''
        CREATE TABLE employee_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            rfid_uid TEXT UNIQUE NOT NULL,
            tag_name TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
        )
    ''')
    print("✅ Created employee_tags table")
    
    # Attendances table
    conn.execute('''
        CREATE TABLE attendances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            check_in_time TEXT,
            check_out_time TEXT,
            note TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees (id),
            UNIQUE(employee_id, date)
        )
    ''')
    print("✅ Created attendances table")
    
    # RFID scan logs table
    conn.execute('''
        CREATE TABLE rfid_scan_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            rfid_uid TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            reader_id TEXT NOT NULL,
            status TEXT NOT NULL,
            note TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees (id)
        )
    ''')
    print("✅ Created rfid_scan_logs table")
    
    # System configuration table
    conn.execute('''
        CREATE TABLE system_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("✅ Created system_config table")
    
    # Insert default employees
    default_employees = [
        ('Trần Cao Thiên Phước', 'EMP001', 'IT', 'Developer', 'phuoc@company.com', '0123456789'),
        ('Nguyễn Thanh Giang', 'EMP002', 'HR', 'Manager', 'giang@company.com', '0987654321'),
        ('Bùi Hữu Lộc', 'EMP003', 'Sales', 'Executive', 'loc@company.com', '0123987456')
    ]
    
    for name, code, dept, pos, email, phone in default_employees:
        conn.execute('''
            INSERT INTO employees (name, employee_code, department, position, email, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ''', (name, code, dept, pos, email, phone))
    print("✅ Inserted default employees")
    
    # Insert default RFID tags
    default_tags = [
        ('ABCD0286', 'Trần Cao Thiên Phước'),
        ('ABCD0114', 'Nguyễn Thanh Giang'),
        ('ABCD0152', 'Bùi Hữu Lộc')
    ]
    
    for rfid_uid, employee_name in default_tags:
        # Get employee ID
        emp = conn.execute('SELECT id FROM employees WHERE name = ?', (employee_name,)).fetchone()
        if emp:
            conn.execute('''
                INSERT INTO employee_tags (employee_id, rfid_uid, tag_name, is_active)
                VALUES (?, ?, ?, 1)
            ''', (emp[0], rfid_uid, f'Tag của {employee_name}'))
    print("✅ Inserted default RFID tags")
    
    # Insert default system configuration
    default_configs = [
        ('checkin_start', '09:00', 'Giờ bắt đầu check-in (HH:MM)'),
        ('checkin_end', '10:00', 'Giờ kết thúc check-in (HH:MM)'),
        ('checkout_start', '17:00', 'Giờ bắt đầu check-out (HH:MM)'),
        ('checkout_end', '18:00', 'Giờ kết thúc check-out (HH:MM)'),
        ('scan_cooldown', '10', 'Thời gian chờ giữa các lần quét (giây)'),
        ('reader_id', 'MAIN_ENTRANCE', 'ID của RFID reader')
    ]
    
    for key, value, desc in default_configs:
        conn.execute('''
            INSERT INTO system_config (config_key, config_value, description)
            VALUES (?, ?, ?)
        ''', (key, value, desc))
    print("✅ Inserted default system configuration")
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    
    print("\n🎉 Database reset completed successfully!")
    print("📊 Database structure:")
    print("   - employees: Quản lý thông tin nhân viên")
    print("   - employee_tags: Quản lý tag RFID (1-nhiều)")
    print("   - attendances: Lưu trữ điểm danh")
    print("   - rfid_scan_logs: Log hoạt động quét tag")
    print("   - system_config: Cấu hình hệ thống")
    print("\n👥 Default employees:")
    for name, code, dept, pos, email, phone in default_employees:
        print(f"   - {name} ({code}) - {dept}/{pos}")
    print("\n🏷️ Default RFID tags:")
    for rfid_uid, employee_name in default_tags:
        print(f"   - {rfid_uid} -> {employee_name}")
    print("\n⚙️ Default configuration:")
    for key, value, desc in default_configs:
        print(f"   - {key}: {value}")

if __name__ == '__main__':
    print("🚀 RFID Check-in System - Database Reset")
    print("=" * 50)
    
    confirm = input("⚠️  This will delete all existing data. Are you sure? (y/N): ")
    
    if confirm.lower() in ['y', 'yes']:
        try:
            reset_database() 
        except Exception as e:
            print(f"❌ Error resetting database: {e}")
    else:
        print("❌ Database reset cancelled") 