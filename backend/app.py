import time 
import sqlite3
import logging
from datetime import datetime, time as dt_time
from typing import Optional, Tuple
import threading

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
from zk import connect_reader, start_inventory, stop_inventory, RFIDTag
from flask_cors import CORS

# ----- Logging Configuration -----
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ----- Flask & Socket.IO Setup -----
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = 'rfid-checkin-secret-key'
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    logger=True,
    engineio_logger=True
)

# ----- RFID Reader Connection -----
logger.info("Attempting to connect to RFID reader on /dev/cu.usbserial-10...")
reader = connect_reader('/dev/cu.usbserial-10', 57600)
if reader:
    logger.info("Successfully connected to RFID reader")
else:
    logger.error("Failed to connect to RFID reader!")

# ----- Configuration -----
def get_system_config():
    """Get system configuration from database"""
    conn = sqlite3.connect('checkins.db')
    configs = conn.execute('SELECT config_key, config_value FROM system_config').fetchall()
    conn.close()
    
    config_dict = {}
    for key, value in configs:
        config_dict[key] = value
    
    return config_dict

def load_config_from_db():
    """Load configuration from database and update global variables"""
    global CHECKIN_START, CHECKIN_END, CHECKOUT_START, CHECKOUT_END, SCAN_COOLDOWN_SECONDS, READER_ID
    
    config = get_system_config()
    
    # Parse time strings to time objects
    try:
        CHECKIN_START = datetime.strptime(config.get('checkin_start', '08:45'), '%H:%M').time()
        CHECKIN_END = datetime.strptime(config.get('checkin_end', '09:15'), '%H:%M').time()
        CHECKOUT_START = datetime.strptime(config.get('checkout_start', '17:45'), '%H:%M').time()
        CHECKOUT_END = datetime.strptime(config.get('checkout_end', '18:15'), '%H:%M').time()
        SCAN_COOLDOWN_SECONDS = int(config.get('scan_cooldown', '10'))
        READER_ID = config.get('reader_id', 'MAIN_ENTRANCE')
    except Exception as e:
        logger.error(f"Error loading config from database: {e}")
        # Use defaults if error
        CHECKIN_START = dt_time(8, 45)
        CHECKIN_END = dt_time(9, 15)
        CHECKOUT_START = dt_time(17, 45)
        CHECKOUT_END = dt_time(18, 15)
        SCAN_COOLDOWN_SECONDS = 10
        READER_ID = "MAIN_ENTRANCE"

# Load config from database
load_config_from_db()

# ----- Employee Data -----
EMPLOYEE_MAP = {}  # Will be populated from database

def load_employee_map():
    """Load employee map from database"""
    global EMPLOYEE_MAP
    conn = sqlite3.connect('checkins.db')
    employees = conn.execute('''
        SELECT e.name, et.rfid_uid 
        FROM employees e 
        JOIN employee_tags et ON e.id = et.employee_id 
        WHERE e.is_active = 1 AND et.is_active = 1
    ''').fetchall()
    conn.close()
    
    EMPLOYEE_MAP = {rfid_uid: name for name, rfid_uid in employees}
logger.info(f"Employee map loaded: {EMPLOYEE_MAP}")

# Load employee map from database
load_employee_map()

# ----- Database Initialization -----
def init_db():
    conn = sqlite3.connect('checkins.db')
    
    # Employees table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS employees (
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
    
    # Employee tags table (1 employee can have multiple tags)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS employee_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            rfid_uid TEXT UNIQUE NOT NULL,
            tag_name TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
        )
    ''')
    
    # Attendances table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS attendances (
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
    
    # RFID scan logs table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS rfid_scan_logs (
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
    
    # System configuration table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS system_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default employees if not exists
    default_employees = [
        ('Trần Cao Thiên Phước', 'EMP001', 'IT', 'Developer', 'phuoc@company.com', '0123456789'),
        ('Nguyễn Thanh Giang', 'EMP002', 'HR', 'Manager', 'giang@company.com', '0987654321'),
        ('Bùi Hữu Lộc', 'EMP003', 'Sales', 'Executive', 'loc@company.com', '0123987456')
    ]
    
    for name, code, dept, pos, email, phone in default_employees:
        conn.execute('''
            INSERT OR IGNORE INTO employees (name, employee_code, department, position, email, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ''', (name, code, dept, pos, email, phone))
    
    # Insert default RFID tags
    default_tags = [
        ('ABCD0286', 'Trần Cao Thiên Phước'),
        ('ABCD0179', 'Nguyễn Thanh Giang'),
        ('ABCD0127', 'Bùi Hữu Lộc')
    ]
    
    for rfid_uid, employee_name in default_tags:
        # Get employee ID
        emp = conn.execute('SELECT id FROM employees WHERE name = ?', (employee_name,)).fetchone()
        if emp:
            conn.execute('''
                INSERT OR IGNORE INTO employee_tags (employee_id, rfid_uid, tag_name, is_active)
                VALUES (?, ?, ?, 1)
            ''', (emp[0], rfid_uid, f'Tag của {employee_name}'))
    
    # Insert default system configuration
    default_configs = [
        ('checkin_start', '08:45', 'Giờ bắt đầu check-in (HH:MM)'),
        ('checkin_end', '09:15', 'Giờ kết thúc check-in (HH:MM)'),
        ('checkout_start', '17:45', 'Giờ bắt đầu check-out (HH:MM)'),
        ('checkout_end', '18:15', 'Giờ kết thúc check-out (HH:MM)'),
        ('scan_cooldown', '10', 'Thời gian chờ giữa các lần quét (giây)'),
        ('reader_id', 'MAIN_ENTRANCE', 'ID của RFID reader')
    ]
    
    for key, value, desc in default_configs:
        conn.execute('''
            INSERT OR IGNORE INTO system_config (config_key, config_value, description)
            VALUES (?, ?, ?)
        ''', (key, value, desc))
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

# ----- Helper Functions -----
def get_employee_id(rfid_uid: str) -> Optional[int]:
    """Get employee ID from RFID UID"""
    conn = sqlite3.connect('checkins.db')
    result = conn.execute('''
        SELECT e.id FROM employees e 
        JOIN employee_tags et ON e.id = et.employee_id 
        WHERE et.rfid_uid = ? AND e.is_active = 1 AND et.is_active = 1
    ''', (rfid_uid,)).fetchone()
    conn.close()
    return result[0] if result else None

def get_current_time_window() -> Tuple[str, bool]:
    """Determine current time window and if it's valid for scanning"""
    now = datetime.now()
    current_time = now.time()
    
    if CHECKIN_START <= current_time <= CHECKIN_END:
        return "checkin", True
    elif CHECKOUT_START <= current_time <= CHECKOUT_END:
        return "checkout", True
    else:
        return "outside", False

def get_today_attendance(employee_id: int) -> Optional[dict]:
    """Get today's attendance record for employee"""
    today = datetime.now().strftime('%Y-%m-%d')
    conn = sqlite3.connect('checkins.db')
    result = conn.execute('''
        SELECT check_in_time, check_out_time 
        FROM attendances 
        WHERE employee_id = ? AND date = ?
    ''', (employee_id, today)).fetchone()
    conn.close()
    
    if result:
        return {
            'check_in_time': result[0],
            'check_out_time': result[1]
        }
    return None

def is_recent_scan(rfid_uid: str) -> bool:
    """Check if this RFID was scanned recently (anti-noise)"""
    conn = sqlite3.connect('checkins.db')
    result = conn.execute('''
        SELECT timestamp FROM rfid_scan_logs 
        WHERE rfid_uid = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
    ''', (rfid_uid,)).fetchone()
    conn.close()
    
    if not result:
        return False
    
    last_scan = datetime.fromisoformat(result[0])
    time_diff = (datetime.now() - last_scan).total_seconds()
    return time_diff < SCAN_COOLDOWN_SECONDS

def log_scan(rfid_uid: str, employee_id: Optional[int], status: str, note: str = ""):
    """Log RFID scan to database"""
    timestamp = datetime.now().isoformat()
    conn = sqlite3.connect('checkins.db')
    conn.execute('''
        INSERT INTO rfid_scan_logs 
        (employee_id, rfid_uid, timestamp, reader_id, status, note)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (employee_id, rfid_uid, timestamp, READER_ID, status, note))
    conn.commit()
    conn.close()

def record_attendance(employee_id: int, check_type: str) -> bool:
    """Record check-in or check-out for employee"""
    today = datetime.now().strftime('%Y-%m-%d')
    timestamp = datetime.now().isoformat()
    
    conn = sqlite3.connect('checkins.db')
    
    # Check if attendance record exists for today
    existing = conn.execute('''
        SELECT id FROM attendances 
        WHERE employee_id = ? AND date = ?
    ''', (employee_id, today)).fetchone()
    
    if existing:
        # Update existing record
        if check_type == 'checkin':
            conn.execute('''
                UPDATE attendances 
                SET check_in_time = ? 
                WHERE employee_id = ? AND date = ?
            ''', (timestamp, employee_id, today))
        else:  # checkout
            conn.execute('''
                UPDATE attendances 
                SET check_out_time = ? 
                WHERE employee_id = ? AND date = ?
            ''', (timestamp, employee_id, today))
    else:
        # Create new record
        if check_type == 'checkin':
            conn.execute('''
                INSERT INTO attendances (employee_id, date, check_in_time)
                VALUES (?, ?, ?)
            ''', (employee_id, today, timestamp))
        else:  # checkout
            conn.execute('''
                INSERT INTO attendances (employee_id, date, check_out_time)
                VALUES (?, ?, ?)
            ''', (employee_id, today, timestamp))
    
    conn.commit()
    conn.close()
    return True

def process_rfid_scan(rfid_uid: str) -> dict:
    """Main logic to process RFID scan"""
    timestamp = datetime.now()
    
    # Get employee info
    employee_id = get_employee_id(rfid_uid)
    if not employee_id:
        log_scan(rfid_uid, None, "unknown_employee", "Unknown RFID UID")
        return {
            'status': 'ignored',
            'reason': 'unknown_employee',
            'message': f'Unknown RFID: {rfid_uid}'
        }
    
    # Check for recent scan (anti-noise)
    if is_recent_scan(rfid_uid):
        log_scan(rfid_uid, employee_id, "ignored", "Recent scan detected")
        return {
            'status': 'ignored',
            'reason': 'recent_scan',
            'message': 'Recent scan detected, ignoring'
        }
    
    # Get current time window
    time_window, is_valid_time = get_current_time_window()
    
    if not is_valid_time:
        log_scan(rfid_uid, employee_id, "outside_hours", f"Scan outside valid hours: {time_window}")
        return {
            'status': 'ignored',
            'reason': 'outside_hours',
            'message': f'Scan outside valid hours ({time_window})'
        }
    
    # Get today's attendance
    today_attendance = get_today_attendance(employee_id)
    
    # Determine action based on time window and current status
    if time_window == "checkin":
        if today_attendance and today_attendance['check_in_time']:
            log_scan(rfid_uid, employee_id, "ignored", "Already checked in today")
            return {
                'status': 'ignored',
                'reason': 'already_checked_in',
                'message': 'Already checked in today'
            }
        else:
            # Record check-in
            record_attendance(employee_id, 'checkin')
            log_scan(rfid_uid, employee_id, "checkin", "Successful check-in")
            return {
                'status': 'success',
                'action': 'checkin',
                'message': 'Check-in recorded successfully'
            }
    
    elif time_window == "checkout":
        if not today_attendance or not today_attendance['check_in_time']:
            log_scan(rfid_uid, employee_id, "ignored", "No check-in found for today")
            return {
                'status': 'ignored',
                'reason': 'no_checkin',
                'message': 'No check-in found for today'
            }
        elif today_attendance['check_out_time']:
            # Update checkout time to latest scan (employee might be leaving now)
            record_attendance(employee_id, 'checkout')
            log_scan(rfid_uid, employee_id, "checkout", "Check-out time updated")
            return {
                'status': 'success',
                'action': 'checkout',
                'message': 'Check-out time updated to latest scan'
            }
        else:
            # Record check-out
            record_attendance(employee_id, 'checkout')
            log_scan(rfid_uid, employee_id, "checkout", "Successful check-out")
            return {
                'status': 'success',
                'action': 'checkout',
                'message': 'Check-out recorded successfully'
            }

# ----- RFID Reader Loop as Background Task -----
reader_running = False
reader_thread_obj = None
reader_thread_lock = threading.Lock()

def reader_thread_func():
    if reader is None:
        logger.error("Cannot start reader thread - no reader connection")
        return

    def on_tag(tag: RFIDTag):
        logger.info(f"Tag detected: {tag}")
        epc = tag.epc
        # Process the scan
        result = process_rfid_scan(epc)
        if result['status'] == 'success':
            employee_id = get_employee_id(epc)
            if employee_id:
                conn = sqlite3.connect('checkins.db')
                name = conn.execute(
                    "SELECT name FROM employees WHERE id = ?", 
                    (employee_id,)
                ).fetchone()[0]
                conn.close()
                data = {
                    'name': name,
                    'action': result['action'],
                    'time': datetime.now().strftime('%H:%M:%S'),
                    'message': result['message']
                }
                socketio.emit('employee_status_update', data)
                logger.info(f"{result['action'].title()}: {name}")
        else:
            logger.info(f"Scan ignored: {result['reason']} - {result['message']}")

    logger.info("Starting inventory process...")
    start_inventory(reader, address=0x00, tag_callback=on_tag)

@app.route('/start_reader', methods=['POST'])
def start_reader():
    global reader_running, reader_thread_obj
    with reader_thread_lock:
        if reader_running:
            return jsonify({'success': False, 'message': 'Reader already running'})
        reader_running = True
        reader_thread_obj = threading.Thread(target=reader_thread_func, daemon=True)
        reader_thread_obj.start()
        logger.info("RFID reader started via API")
        return jsonify({'success': True, 'message': 'Reader started'})

@app.route('/stop_reader', methods=['POST'])
def stop_reader():
    global reader_running
    with reader_thread_lock:
        if not reader_running:
            return jsonify({'success': False, 'message': 'Reader is not running'})
        try:
            stop_inventory(reader, address=0x00)
            reader_running = False
            logger.info("RFID reader stopped via API")
            return jsonify({'success': True, 'message': 'Reader stopped'})
        except Exception as e:
            logger.error(f"Error stopping reader: {e}")
            return jsonify({'success': False, 'message': str(e)})

@app.route('/reader_status')
def reader_status():
    return jsonify({'running': reader_running})

# ----- HTTP Routes -----
@app.route('/')
def index():
    today = datetime.now().strftime('%Y-%m-%d')
    conn = sqlite3.connect('checkins.db')
    # Get all employees with their attendance for today and all tags
    employees = conn.execute('''
        SELECT e.id, e.name,
               (SELECT GROUP_CONCAT(et.rfid_uid, ', ') FROM employee_tags et WHERE et.employee_id = e.id AND et.is_active = 1) as rfid_uids,
               a.check_in_time, a.check_out_time
        FROM employees e
        LEFT JOIN attendances a ON e.id = a.employee_id AND a.date = ?
        WHERE e.is_active = 1
        ORDER BY e.name
    ''', (today,)).fetchall()
    records = []
    for emp_id, name, rfid_uids, check_in, check_out in employees:
        records.append({
            'id': emp_id,
            'name': name,
            'rfid_uids': rfid_uids or '',
            'check_in_time': check_in,
            'check_out_time': check_out,
            'status': 'present' if check_in else 'absent'
        })
    # Lấy config khung giờ
    config = get_system_config()
    checkin_start = config.get('checkin_start', '08:45')
    checkin_end = config.get('checkin_end', '09:15')
    checkout_start = config.get('checkout_start', '17:45')
    checkout_end = config.get('checkout_end', '18:15')
    conn.close()
    return render_template('index.html', records=records,
        checkin_start=checkin_start, checkin_end=checkin_end,
        checkout_start=checkout_start, checkout_end=checkout_end)

@app.route('/get_attendance_data')
def get_attendance_data():
    today = datetime.now().strftime('%Y-%m-%d')
    conn = sqlite3.connect('checkins.db')
    
    employees = conn.execute('''
        SELECT e.id, e.name,
               (SELECT GROUP_CONCAT(et.rfid_uid, ', ') FROM employee_tags et WHERE et.employee_id = e.id AND et.is_active = 1) as rfid_uids,
               a.check_in_time, a.check_out_time
        FROM employees e
        LEFT JOIN attendances a ON e.id = a.employee_id AND a.date = ?
        WHERE e.is_active = 1
        ORDER BY e.name
    ''', (today,)).fetchall()

    records = []
    for emp_id, name, rfid_uids, check_in, check_out in employees:
        records.append({
            'id': emp_id,
            'name': name,
            'rfid_uids': rfid_uids or '',
            'check_in_time': check_in,
            'check_out_time': check_out,
            'status': 'present' if check_in else 'absent'
        })
    
    conn.close()
    return jsonify(records)

@app.route('/clear_today_data', methods=['POST'])
def clear_today_data():
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        conn = sqlite3.connect('checkins.db')
        conn.execute("DELETE FROM attendances WHERE date=?", (today,))
        conn.execute("DELETE FROM rfid_scan_logs WHERE date(timestamp)=?", (today,))
        conn.commit()
        conn.close()
        logger.info(f"Cleared all attendance data for {today}")
        return jsonify({'success': True, 'message': f'Cleared data for {today}'})
    except Exception as e:
        logger.error(f"Error clearing data: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/scan_logs')
def scan_logs():
    """View recent scan logs"""
    conn = sqlite3.connect('checkins.db')
    logs = conn.execute('''
        SELECT sl.timestamp, e.name, sl.rfid_uid, sl.status, sl.note
        FROM rfid_scan_logs sl
        LEFT JOIN employees e ON sl.employee_id = e.id
        ORDER BY sl.timestamp DESC
        LIMIT 100
    ''').fetchall()
    # Thống kê
    total_logs = conn.execute('SELECT COUNT(*) FROM rfid_scan_logs').fetchone()[0]
    total_success = conn.execute("""
        SELECT COUNT(*) FROM rfid_scan_logs WHERE status IN ('checkin', 'checkout')
    """).fetchone()[0]
    total_ignored = conn.execute("""
        SELECT COUNT(*) FROM rfid_scan_logs WHERE status IN (
            'ignored', 'outside_hours', 'recent_scan', 'already_checked_in', 'already_checked_out', 'no_checkin')
    """).fetchone()[0]
    conn.close()
    def get_status_display(status):
        status_map = {
            'checkin': 'Check-in',
            'checkout': 'Check-out',
            'ignored': 'Bị bỏ qua',
            'unknown_employee': 'Thẻ không xác định',
            'outside_hours': 'Ngoài giờ',
            'recent_scan': 'Quét gần đây',
            'already_checked_in': 'Đã check-in',
            'already_checked_out': 'Đã check-out',
            'no_checkin': 'Chưa check-in'
        }
        return status_map.get(status, status)
    return render_template('scan_logs.html', logs=logs, get_status_display=get_status_display,
                           total_logs=total_logs, total_success=total_success, total_ignored=total_ignored)

# ----- Admin Routes -----
@app.route('/admin')
def admin_dashboard():
    """Admin dashboard"""
    conn = sqlite3.connect('checkins.db')
    
    # Get statistics
    total_employees = conn.execute('SELECT COUNT(*) FROM employees WHERE is_active = 1').fetchone()[0]
    total_tags = conn.execute('SELECT COUNT(*) FROM employee_tags WHERE is_active = 1').fetchone()[0]
    today_attendance = conn.execute('''
        SELECT COUNT(*) FROM attendances 
        WHERE date = ? AND check_in_time IS NOT NULL
    ''', (datetime.now().strftime('%Y-%m-%d'),)).fetchone()[0]
    
    # Get recent activities
    recent_logs = conn.execute('''
        SELECT sl.timestamp, e.name, sl.status, sl.note
        FROM rfid_scan_logs sl
        LEFT JOIN employees e ON sl.employee_id = e.id
        ORDER BY sl.timestamp DESC
        LIMIT 10
    ''').fetchall()
    
    conn.close()
    
    return render_template('admin/dashboard.html', 
                         total_employees=total_employees,
                         total_tags=total_tags,
                         today_attendance=today_attendance,
                         recent_logs=recent_logs)

@app.route('/admin/employees')
def admin_employees():
    """Employee management page"""
    conn = sqlite3.connect('checkins.db')
    employees = conn.execute('''
        SELECT e.*, 
               COUNT(et.id) as tag_count
        FROM employees e
        LEFT JOIN employee_tags et ON e.id = et.employee_id AND et.is_active = 1
        WHERE e.is_active = 1
        GROUP BY e.id
        ORDER BY e.name
    ''').fetchall()
    conn.close()
    
    return render_template('admin/employees.html', employees=employees)

@app.route('/admin/employees/add', methods=['GET', 'POST'])
def admin_add_employee():
    """Add new employee"""
    if request.method == 'POST':
        try:
            name = request.form['name']
            employee_code = request.form['employee_code']
            department = request.form['department']
            position = request.form['position']
            email = request.form['email']
            phone = request.form['phone']
            
            conn = sqlite3.connect('checkins.db')
            conn.execute('''
                INSERT INTO employees (name, employee_code, department, position, email, phone)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (name, employee_code, department, position, email, phone))
            conn.commit()
            conn.close()
            
            # Reload employee map
            load_employee_map()
            
            return jsonify({'success': True, 'message': 'Employee added successfully'})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    return render_template('admin/employee_form.html', employee=None)

@app.route('/admin/employees/edit/<int:employee_id>', methods=['GET', 'POST'])
def admin_edit_employee(employee_id):
    """Edit employee"""
    conn = sqlite3.connect('checkins.db')
    
    if request.method == 'POST':
        try:
            name = request.form['name']
            employee_code = request.form['employee_code']
            department = request.form['department']
            position = request.form['position']
            email = request.form['email']
            phone = request.form['phone']
            
            conn.execute('''
                UPDATE employees 
                SET name=?, employee_code=?, department=?, position=?, email=?, phone=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
            ''', (name, employee_code, department, position, email, phone, employee_id))
            conn.commit()
            
            # Reload employee map
            load_employee_map()
            
            return jsonify({'success': True, 'message': 'Employee updated successfully'})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    employee = conn.execute('SELECT * FROM employees WHERE id = ?', (employee_id,)).fetchone()
    conn.close()
    
    if not employee:
        return "Employee not found", 404
    
    return render_template('admin/employee_form.html', employee=employee)

@app.route('/admin/employees/delete/<int:employee_id>', methods=['POST'])
def admin_delete_employee(employee_id):
    """Delete employee (soft delete)"""
    try:
        conn = sqlite3.connect('checkins.db')
        conn.execute('UPDATE employees SET is_active = 0 WHERE id = ?', (employee_id,))
        conn.commit()
        conn.close()
        
        # Reload employee map
        load_employee_map()
        
        return jsonify({'success': True, 'message': 'Employee deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/tags')
def admin_tags():
    """Tag management page"""
    conn = sqlite3.connect('checkins.db')
    tags = conn.execute('''
        SELECT et.*, e.name as employee_name, e.employee_code
        FROM employee_tags et
        JOIN employees e ON et.employee_id = e.id
        WHERE et.is_active = 1 AND e.is_active = 1
        ORDER BY e.name, et.rfid_uid
    ''').fetchall()
    
    employees = conn.execute('''
        SELECT id, name, employee_code 
        FROM employees 
        WHERE is_active = 1 
        ORDER BY name
    ''').fetchall()
    
    conn.close()
    
    return render_template('admin/tags.html', tags=tags, employees=employees)

@app.route('/admin/tags/add', methods=['POST'])
def admin_add_tag():
    """Add new tag"""
    try:
        employee_id = request.form['employee_id']
        rfid_uid = request.form['rfid_uid']
        tag_name = request.form['tag_name']
        
        conn = sqlite3.connect('checkins.db')
        conn.execute('''
            INSERT INTO employee_tags (employee_id, rfid_uid, tag_name)
            VALUES (?, ?, ?)
        ''', (employee_id, rfid_uid, tag_name))
        conn.commit()
        conn.close()
        
        # Reload employee map
        load_employee_map()
        
        return jsonify({'success': True, 'message': 'Tag added successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/tags/delete/<int:tag_id>', methods=['POST'])
def admin_delete_tag(tag_id):
    """Delete tag (soft delete)"""
    try:
        conn = sqlite3.connect('checkins.db')
        conn.execute('UPDATE employee_tags SET is_active = 0 WHERE id = ?', (tag_id,))
        conn.commit()
        conn.close()
        
        # Reload employee map
        load_employee_map()
        
        return jsonify({'success': True, 'message': 'Tag deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/config')
def admin_config():
    """System configuration page"""
    config = get_system_config()
    return render_template('admin/config.html', config=config)

@app.route('/admin/config/update', methods=['POST'])
def admin_update_config():
    """Update system configuration"""
    try:
        config_data = request.get_json()
        
        conn = sqlite3.connect('checkins.db')
        for key, value in config_data.items():
            conn.execute('''
                UPDATE system_config 
                SET config_value = ?, updated_at = CURRENT_TIMESTAMP
                WHERE config_key = ?
            ''', (value, key))
        conn.commit()
        conn.close()
        
        # Reload configuration
        load_config_from_db()
        
        return jsonify({'success': True, 'message': 'Configuration updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ----- Socket.IO Event Handlers -----
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

# ----- API Routes -----
@app.route('/api/attendance')
def api_attendance():
    today = datetime.now().strftime('%Y-%m-%d')
    conn = sqlite3.connect('checkins.db')
    employees = conn.execute('''
        SELECT e.id, e.name,
               (SELECT GROUP_CONCAT(et.rfid_uid, ', ') FROM employee_tags et WHERE et.employee_id = e.id AND et.is_active = 1) as rfid_uids,
               a.check_in_time, a.check_out_time
        FROM employees e
        LEFT JOIN attendances a ON e.id = a.employee_id AND a.date = ?
        WHERE e.is_active = 1
        ORDER BY e.name
    ''', (today,)).fetchall()
    records = []
    for emp_id, name, rfid_uids, check_in, check_out in employees:
        records.append({
            'id': emp_id,
            'name': name,
            'rfid_uids': rfid_uids or '',
            'check_in_time': check_in,
            'check_out_time': check_out,
            'status': 'present' if check_in else 'absent'
        })
    conn.close()
    return jsonify(records)

@app.route('/api/employees')
def api_employees():
    conn = sqlite3.connect('checkins.db')
    employees = conn.execute('''
        SELECT e.id, e.name, e.employee_code, e.department, e.position, e.email, e.phone, e.is_active, e.created_at, e.updated_at,
               COUNT(et.id) as tag_count
        FROM employees e
        LEFT JOIN employee_tags et ON e.id = et.employee_id AND et.is_active = 1
        WHERE e.is_active = 1
        GROUP BY e.id, e.name, e.employee_code, e.department, e.position, e.email, e.phone, e.is_active, e.created_at, e.updated_at
        ORDER BY e.name
    ''').fetchall()
    result = []
    for emp in employees:
        result.append({
            'id': emp[0],
            'name': emp[1],
            'employee_code': emp[2],
            'department': emp[3],
            'position': emp[4],
            'email': emp[5],
            'phone': emp[6],
            'is_active': bool(emp[7]),
            'created_at': emp[8],
            'updated_at': emp[9],
            'tag_count': emp[10]
        })
    conn.close()
    return jsonify(result)

@app.route('/api/tags')
def api_tags():
    conn = sqlite3.connect('checkins.db')
    tags = conn.execute('''
        SELECT et.id, et.employee_id, et.rfid_uid, et.tag_name, et.is_active, et.created_at,
               e.name as employee_name, e.employee_code
        FROM employee_tags et
        JOIN employees e ON et.employee_id = e.id
        WHERE et.is_active = 1 AND e.is_active = 1
        ORDER BY e.name, et.rfid_uid
    ''').fetchall()
    result = []
    for tag in tags:
        result.append({
            'id': tag[0],
            'employee_id': tag[1],
            'rfid_uid': tag[2],
            'tag_name': tag[3],
            'is_active': bool(tag[4]),
            'created_at': tag[5],
            'employee_name': tag[6],
            'employee_code': tag[7]
        })
    conn.close()
    return jsonify(result)

@app.route('/api/logs')
def api_logs():
    conn = sqlite3.connect('checkins.db')
    logs = conn.execute('''
        SELECT sl.id, sl.rfid_uid, e.name as employee_name, e.employee_code, sl.timestamp, 
               CASE 
                   WHEN sl.status = 'checkin' THEN 'checkin'
                   WHEN sl.status = 'checkout' THEN 'checkout'
                   WHEN sl.status = 'ignored' AND sl.note = 'Already checked in today' THEN 'already_checked_in'
                   WHEN sl.status = 'ignored' AND sl.note = 'No check-in found for today' THEN 'no_checkin'
                   WHEN sl.status = 'ignored' AND sl.note = 'Recent scan detected' THEN 'recent_scan'
                   WHEN sl.status = 'ignored' AND sl.note = 'Unknown RFID UID' THEN 'unknown_employee'
                   WHEN sl.status = 'outside_hours' THEN 'outside_hours'
                   ELSE sl.status
               END as event_type,
               sl.reader_id as device_id, 'success' as status
        FROM rfid_scan_logs sl
        LEFT JOIN employees e ON sl.employee_id = e.id
        ORDER BY sl.timestamp DESC
    ''').fetchall()
    result = []
    for log in logs:
        result.append({
            'id': log[0],
            'rfid_uid': log[1],
            'employee_name': log[2] or 'Unknown',
            'employee_code': log[3] or 'N/A',
            'scan_time': log[4],
            'event_type': log[5],
            'device_id': log[6],
            'status': log[7]
        })
    conn.close()
    return jsonify(result)

@app.route('/api/config')
def api_config():
    config = get_system_config()
    return jsonify(config)

@app.route('/api/reader/status')
def api_reader_status():
    return jsonify({'running': reader_running})

@app.route('/api/reader/start', methods=['POST'])
def api_reader_start():
    global reader_running, reader_thread_obj
    with reader_thread_lock:
        if reader_running:
            return jsonify({'success': False, 'message': 'Reader already running'})
        reader_running = True
        reader_thread_obj = threading.Thread(target=reader_thread_func, daemon=True)
        reader_thread_obj.start()
        logger.info("RFID reader started via API")
        return jsonify({'success': True, 'message': 'Reader started'})

@app.route('/api/reader/stop', methods=['POST'])
def api_reader_stop():
    global reader_running
    with reader_thread_lock:
        if not reader_running:
            return jsonify({'success': False, 'message': 'Reader is not running'})
        try:
            stop_inventory(reader, address=0x00)
            reader_running = False
            logger.info("RFID reader stopped via API")
            return jsonify({'success': True, 'message': 'Reader stopped'})
        except Exception as e:
            logger.error(f"Error stopping reader: {e}")
            return jsonify({'success': False, 'message': str(e)})

@app.route('/api/attendance/clear_today', methods=['POST'])
def api_clear_today_attendance():
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        conn = sqlite3.connect('checkins.db')
        conn.execute("DELETE FROM attendances WHERE date=?", (today,))
        conn.execute("DELETE FROM rfid_scan_logs WHERE date(timestamp)=?", (today,))
        conn.commit()
        conn.close()
        logger.info(f"Cleared all attendance data for {today}")
        return jsonify({'success': True, 'message': f'Cleared data for {today}'})
    except Exception as e:
        logger.error(f"Error clearing data: {e}")
        return jsonify({'success': False, 'error': str(e)})

# Employee Management RESTful APIs
@app.route('/api/employees', methods=['POST'])
def api_create_employee():
    try:
        data = request.get_json()
        conn = sqlite3.connect('checkins.db')
        cursor = conn.cursor()
        
        # Check if employee_code already exists (including soft-deleted ones)
        existing = cursor.execute('SELECT id, is_active FROM employees WHERE employee_code = ?', 
                                (data.get('employee_code'),)).fetchone()
        
        if existing:
            if existing[1] == 1:  # Active employee with same code
                conn.close()
                return jsonify({'success': False, 'message': f'Employee code "{data.get("employee_code")}" already exists'})
            else:  # Soft-deleted employee with same code
                # Reactivate the soft-deleted employee
                cursor.execute('''
                    UPDATE employees 
                    SET name = ?, department = ?, position = ?, email = ?, phone = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (
                    data.get('name'),
                    data.get('department'),
                    data.get('position'),
                    data.get('email'),
                    data.get('phone'),
                    existing[0]
                ))
                conn.commit()
                conn.close()
                return jsonify({'success': True, 'message': 'Employee reactivated successfully', 'id': existing[0]})
        
        # Create new employee
        cursor.execute('''
            INSERT INTO employees (name, employee_code, department, position, email, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ''', (
            data.get('name'),
            data.get('employee_code'),
            data.get('department'),
            data.get('position'),
            data.get('email'),
            data.get('phone')
        ))
        
        employee_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Employee created successfully', 'id': employee_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/employees/<int:employee_id>', methods=['PUT'])
def api_update_employee(employee_id):
    try:
        data = request.get_json()
        conn = sqlite3.connect('checkins.db')
        cursor = conn.cursor()
        
        # Check if the new employee_code already exists for a different employee
        existing = cursor.execute('SELECT id FROM employees WHERE employee_code = ? AND id != ?', 
                                (data.get('employee_code'), employee_id)).fetchone()
        
        if existing:
            conn.close()
            return jsonify({'success': False, 'message': f'Employee code "{data.get("employee_code")}" already exists'})
        
        cursor.execute('''
            UPDATE employees 
            SET name = ?, employee_code = ?, department = ?, position = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('name'),
            data.get('employee_code'),
            data.get('department'),
            data.get('position'),
            data.get('email'),
            data.get('phone'),
            employee_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Employee updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
def api_delete_employee(employee_id):
    try:
        conn = sqlite3.connect('checkins.db')
        
        # Soft delete - set is_active to 0
        conn.execute('UPDATE employees SET is_active = 0 WHERE id = ?', (employee_id,))
        conn.execute('UPDATE employee_tags SET is_active = 0 WHERE employee_id = ?', (employee_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Employee deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# Tag Management RESTful APIs
@app.route('/api/tags', methods=['POST'])
def api_create_tag():
    try:
        data = request.get_json()
        conn = sqlite3.connect('checkins.db')
        cursor = conn.cursor()
        
        # Check if rfid_uid already exists (including soft-deleted ones)
        existing = cursor.execute('SELECT id, is_active FROM employee_tags WHERE rfid_uid = ?', 
                                (data.get('rfid_uid'),)).fetchone()
        
        if existing:
            if existing[1] == 1:  # Active tag with same UID
                conn.close()
                return jsonify({'success': False, 'message': f'RFID UID "{data.get("rfid_uid")}" already exists'})
            else:  # Soft-deleted tag with same UID
                # Reactivate the soft-deleted tag
                cursor.execute('''
                    UPDATE employee_tags 
                    SET employee_id = ?, tag_name = ?, is_active = 1
                    WHERE id = ?
                ''', (
                    data.get('employee_id'),
                    data.get('tag_name'),
                    existing[0]
                ))
                conn.commit()
                conn.close()
                return jsonify({'success': True, 'message': 'Tag reactivated successfully', 'id': existing[0]})
        
        # Create new tag
        cursor.execute('''
            INSERT INTO employee_tags (employee_id, rfid_uid, tag_name, is_active)
            VALUES (?, ?, ?, 1)
        ''', (
            data.get('employee_id'),
            data.get('rfid_uid'),
            data.get('tag_name')
        ))
        
        tag_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Tag created successfully', 'id': tag_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/tags/<int:tag_id>', methods=['PUT'])
def api_update_tag(tag_id):
    try:
        data = request.get_json()
        conn = sqlite3.connect('checkins.db')
        cursor = conn.cursor()
        
        # Check if the new rfid_uid already exists for a different tag
        existing = cursor.execute('SELECT id FROM employee_tags WHERE rfid_uid = ? AND id != ?', 
                                (data.get('rfid_uid'), tag_id)).fetchone()
        
        if existing:
            conn.close()
            return jsonify({'success': False, 'message': f'RFID UID "{data.get("rfid_uid")}" already exists'})
        
        cursor.execute('''
            UPDATE employee_tags 
            SET employee_id = ?, rfid_uid = ?, tag_name = ?
            WHERE id = ?
        ''', (
            data.get('employee_id'),
            data.get('rfid_uid'),
            data.get('tag_name'),
            tag_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Tag updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/tags/<int:tag_id>', methods=['DELETE'])
def api_delete_tag(tag_id):
    try:
        conn = sqlite3.connect('checkins.db')
        
        # Soft delete - set is_active to 0
        conn.execute('UPDATE employee_tags SET is_active = 0 WHERE id = ?', (tag_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Tag deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ----- Main Entry Point -----
if __name__ == '__main__':
    init_db()
    # Không tự động start reader nữa
    logger.info("App ready. Use web UI to start/stop reader.")
    logger.info("Starting Flask-SocketIO app on http://localhost:3000")
    socketio.run(app, host='0.0.0.0', port=3000, debug=False)