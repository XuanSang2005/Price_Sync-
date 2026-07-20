-- Validate động cho field khai thêm: chỉ kiểm được HÌNH DẠNG (kiểu + bắt buộc),
-- không semantic-check như 4 luật FR-03 cứng (code hiểu field cố định mới kiểm sâu được).
--   data_type: STRING | NUMBER | DATE (NULL = không kiểm — field cố định để NULL)
--   required : true → thiếu thì set aside
ALTER TABLE mapping_rule
    ADD COLUMN data_type VARCHAR,
    ADD COLUMN required  BOOLEAN NOT NULL DEFAULT false;
