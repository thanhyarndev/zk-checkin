import eventlet
eventlet.monkey_patch()

import time 
import sqlite3
import logging

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
from zk import connect_reader, start_inventory, RFIDTag

# ----- Logging Configuration -----
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ----- Flask & Socket.IO Setup -----
app = Flask(__name__)
app.config['SECRET_KEY'] = 'rfid-checkin-secret-key'
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=True,
    engineio_logger=True
)

# ----- RFID Reader Connection -----
logger.info("Attempting to connect to RFID reader on COM1...")
reader = connect_reader('COM1', 57600)
if reader:
    logger.info("Successfully connected to RFID reader")
else:
    logger.error("Failed to connect to RFID reader!")

# ----- EPC → Employee Mappings -----
EMPLOYEE_MAP = {
    'ABCD0286': 'Trần Cao Thiên Phước',
    'ABCD0179': 'Nguyễn Thanh Giang',
    'ABCD0127': 'Bùi Hữu Lộc'
}
logger.info(f"Employee map loaded: {EMPLOYEE_MAP}")

# ----- Database Initialization -----
def init_db():
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
    logger.info("Database initialized successfully")

# ----- Helper: Fetch Today's Status -----
def get_employee_status(employee_name, date):
    conn = sqlite3.connect('checkins.db')
    rows = conn.execute(
        "SELECT check_type, timestamp FROM checkins "
        "WHERE employee_name=? AND date(timestamp)=? "
        "ORDER BY timestamp",
        (employee_name, date)
    ).fetchall()
    conn.close()

    if not rows:
        return None, None

    first_checkin = None
    last_checkout = None
    for check_type, timestamp in rows:
        if check_type == 'checkin' and first_checkin is None:
            first_checkin = timestamp
        elif check_type == 'checkout':
            last_checkout = timestamp

    return first_checkin, last_checkout

# ----- Helper: Record & Emit Status -----
def update_employee_status(employee_name, epc, timestamp):
    today = time.strftime('%Y-%m-%d')
    first_checkin, last_checkout = get_employee_status(employee_name, today)

    if first_checkin is None:
        check_type = 'checkin'
        status_msg = f"Check-in: {employee_name}"
    else:
        check_type = 'checkout'
        status_msg = f"Check-out: {employee_name}"

    # Insert record
    conn = sqlite3.connect('checkins.db')
    conn.execute(
        "INSERT INTO checkins (epc, employee_name, timestamp, check_type) "
        "VALUES (?, ?, ?, ?)",
        (epc, employee_name, timestamp, check_type)
    )
    conn.commit()
    conn.close()

    logger.info(status_msg)

    # Fetch updated status
    updated_first, updated_last = get_employee_status(employee_name, today)
    data = {
        'name': employee_name,
        'check_type': check_type,
        'time': timestamp,
        'first_checkin': updated_first,
        'last_checkout': updated_last
    }
    logger.info(f"Emitting employee_status_update: {data}")
    
    # Use eventlet to ensure proper emission from background thread
    import eventlet
    eventlet.spawn(socketio.emit, 'employee_status_update', data)
    
    return True  # Success

# ----- RFID Reader Loop as Background Task -----
def reader_thread():
    if reader is None:
        logger.error("Cannot start reader thread - no reader connection")
        return

    def on_tag(tag: RFIDTag):
        logger.info(f"Tag detected: {tag}")
        epc = tag.epc
        name = EMPLOYEE_MAP.get(epc)
        if not name:
            logger.warning(f"Unknown EPC: {epc}")
            return

        ts = time.strftime('%Y-%m-%d %H:%M:%S')
        update_employee_status(name, epc, ts)

    logger.info("Starting inventory process...")
    start_inventory(reader, address=0x00, tag_callback=on_tag)

# ----- HTTP Routes -----
@app.route('/')
def index():
    today = time.strftime('%Y-%m-%d')
    conn = sqlite3.connect('checkins.db')
    employees = conn.execute(
        "SELECT DISTINCT employee_name FROM checkins WHERE date(timestamp)=?",
        (today,)
    ).fetchall()

    records = []
    for (employee_name,) in employees:
        first, last = get_employee_status(employee_name, today)
        records.append({
            'name': employee_name,
            'first_checkin': first,
            'last_checkout': last
        })
    conn.close()
    records.sort(key=lambda x: x['first_checkin'] or '')
    return render_template('index.html', records=records)

@app.route('/get_attendance_data')
def get_attendance_data():
    today = time.strftime('%Y-%m-%d')
    conn = sqlite3.connect('checkins.db')
    employees = conn.execute(
        "SELECT DISTINCT employee_name FROM checkins WHERE date(timestamp)=?",
        (today,)
    ).fetchall()

    records = []
    for (employee_name,) in employees:
        first, last = get_employee_status(employee_name, today)
        records.append({
            'name': employee_name,
            'first_checkin': first,
            'last_checkout': last
        })
    conn.close()
    records.sort(key=lambda x: x['first_checkin'] or '')
    return jsonify(records)

@app.route('/clear_today_data', methods=['POST'])
def clear_today_data():
    try:
        today = time.strftime('%Y-%m-%d')
        conn = sqlite3.connect('checkins.db')
        conn.execute("DELETE FROM checkins WHERE date(timestamp)=?", (today,))
        conn.commit()
        conn.close()
        logger.info(f"Cleared all check-in data for {today}")
        return jsonify({'success': True, 'message': f'Cleared data for {today}'})
    except Exception as e:
        logger.error(f"Error clearing data: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ----- Socket.IO Event Handlers -----
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

# ----- Main Entry Point -----
if __name__ == '__main__':
    init_db()
    socketio.start_background_task(reader_thread)
    logger.info("Reader background task scheduled")
    logger.info("Starting Flask-SocketIO app on http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)