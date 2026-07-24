-- Bỏ kiểm KIỂU field động: cột data_type không còn ai đọc (Validator chỉ còn kiểm field chuẩn + 'required').
-- Giữ lại cột 'required' (kiểm field động BẮT BUỘC có mặt vẫn dùng).
ALTER TABLE mapping_rule DROP COLUMN data_type;
