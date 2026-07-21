-- Lưu TÊN file MNT đã ghi ra cho mỗi batch, để console đọc lại nội dung file thật
-- (không dựng lại CSV ở UI — tránh lệch với Mapper/Builder).
ALTER TABLE price_batch ADD COLUMN output_file varchar;
