# 🏢 RFID Check-In System

Hệ thống điểm danh nhân viên sử dụng RFID, hiển thị thời gian check-in đầu tiên và check-out cuối cùng của mỗi nhân viên trong ngày.

## ✨ Tính năng

- **Check-in/Check-out thông minh**: Tự động phân biệt lần quẹt thẻ đầu tiên (check-in) và lần quẹt thẻ tiếp theo (check-out)
- **Giao diện real-time**: Cập nhật ngay lập tức khi có nhân viên quẹt thẻ
- **Hiển thị trạng thái**: Chỉ hiển thị thời gian check-in đầu tiên và check-out cuối cùng
- **Giao diện đẹp**: Thiết kế hiện đại với màu sắc trực quan

## 🚀 Cài đặt

1. **Cài đặt dependencies**:
```bash
pip install -r requirements.txt
```

2. **Kiểm tra đầu đọc RFID**:
```bash
python test_reader.py
```

3. **Reset database (nếu cần)**:
```bash
python reset_db.py
```

4. **Chạy ứng dụng**:
```bash
python app.py
```

5. **Truy cập website**:
Mở trình duyệt và truy cập: `http://localhost:5000`

## ⚙️ Cấu hình

### Cập nhật thông tin nhân viên
Chỉnh sửa `EMPLOYEE_MAP` trong file `app.py`:

```python
EMPLOYEE_MAP = {
    'ABCD0286': 'Trần Cao Thiên Phước',
    'ABCD0415': 'Nguyễn Thanh Giang',
    'ABCD0127': 'Bùi Hữu Lộc'
    # Thêm nhân viên mới ở đây
}
```

### Thay đổi cổng COM
Nếu đầu đọc RFID không kết nối được, hãy thay đổi cổng COM trong `app.py`:

```python
reader = connect_reader('COM2', 57600)  # Thay COM1 thành COM2, COM3, etc.
```

## 📊 Cách hoạt động

1. **Check-in**: Lần quẹt thẻ đầu tiên trong ngày của nhân viên
2. **Check-out**: Lần quẹt thẻ thứ hai trở đi trong ngày của nhân viên
3. **Hiển thị**: Chỉ hiển thị thời gian check-in đầu tiên và check-out cuối cùng

## 🔧 Troubleshooting

### Đầu đọc không kết nối được
- Kiểm tra cổng COM trong Device Manager
- Thử các cổng COM khác (COM2, COM3, etc.)
- Kiểm tra driver của đầu đọc RFID

### Không đọc được thẻ
- Đảm bảo thẻ RFID nằm trong danh sách `EMPLOYEE_MAP`
- Kiểm tra khoảng cách giữa thẻ và đầu đọc
- Chạy `python test_reader.py` để kiểm tra

### Website không hiển thị dữ liệu
- Kiểm tra console log để xem có lỗi gì không
- Đảm bảo WebSocket đã kết nối thành công
- Refresh trang web

## 📁 Cấu trúc file

```
checkin_app/
├── app.py              # Ứng dụng chính
├── zk.py               # Thư viện điều khiển đầu đọc RFID
├── test_reader.py      # Script test đầu đọc
├── reset_db.py         # Script reset database
├── requirements.txt    # Dependencies
├── checkins.db         # Database SQLite
└── templates/
    └── index.html      # Giao diện web
```

## 🎯 Sử dụng

1. Chạy ứng dụng: `python app.py`
2. Mở trình duyệt: `http://localhost:5000`
3. Quẹt thẻ RFID để test hệ thống
4. Xem thời gian check-in/check-out hiển thị real-time

## 📝 Ghi chú

- Hệ thống tự động phân biệt check-in và check-out dựa trên thứ tự quẹt thẻ
- Dữ liệu được lưu trong SQLite database
- Giao diện cập nhật real-time qua WebSocket
- Chỉ hiển thị dữ liệu của ngày hiện tại 