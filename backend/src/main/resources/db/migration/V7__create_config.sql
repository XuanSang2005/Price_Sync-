CREATE TABLE config(
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR NOT NULL UNIQUE,
    config_value VARCHAR NOT NULL
);

INSERT INTO config (config_key, config_value) VALUES ('abort_threshold', '0.2');