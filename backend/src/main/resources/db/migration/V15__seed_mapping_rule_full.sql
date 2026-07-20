-- Seed nốt các cột còn thiếu để sổ tái hiện ĐÚNG file MNT cũ (golden file).
-- V14 mới có FDETL 1,2,5. Thêm:
--   FDETL 3 location (SPLIT tách sau "_"), 4 price (DIRECT, đã format scale 0 ở Mapper),
--         6 effStart (DIRECT, default businessDate+1 ở Mapper), 7 effEnd (DIRECT, null→"").
--   FDELE 1 item, 2 locType (VALUE_MAP), 3 location (SPLIT) — dòng xoá chỉ 3 cột, KHÔNG có giá.
INSERT INTO mapping_rule (record_type, position, json_field, mnt_column, rule_type, rule_value) VALUES
  ('FDETL', 3, 'store_id_or_zone', 'LOCATION',  'SPLIT',     NULL),
  ('FDETL', 4, 'price',            'PRICE',     'DIRECT',    NULL),
  ('FDETL', 6, 'effective_start',  'EFF_START', 'DIRECT',    NULL),
  ('FDETL', 7, 'effective_end',    'EFF_END',   'DIRECT',    NULL),
  ('FDELE', 1, 'item_id',          'ITEM',      'DIRECT',    NULL),
  ('FDELE', 2, 'store_id_or_zone', 'LOC_TYPE',  'VALUE_MAP', '{"STORE":"S","ZONE":"Z"}'),
  ('FDELE', 3, 'store_id_or_zone', 'LOCATION',  'SPLIT',     NULL);
