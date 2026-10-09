-- The whole domain schema (docs/design.md, "Database"). Later changes go into new files.

CREATE TABLE admins (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      text NOT NULL UNIQUE,
    password_hash text NOT NULL, -- Argon2id
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Login sessions. The token itself is never stored, only its SHA-256 (hex).
CREATE TABLE sessions (
    token_hash text PRIMARY KEY,
    admin_id   bigint NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE series (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    min_value  double precision NOT NULL,
    max_value  double precision NOT NULL,
    color      text NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    icon       text,
    unit       text CHECK (length(unit) <= 20),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (min_value < max_value)
);

CREATE TABLE sensors (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    series_id           bigint NOT NULL REFERENCES series (id) ON DELETE CASCADE,
    api_key_hash        text NOT NULL UNIQUE, -- SHA-256 (hex) of the key
    created_at          timestamptz NOT NULL DEFAULT now(),
    last_measurement_at timestamptz
);

CREATE INDEX sensors_series_id_idx ON sensors (series_id);

-- Unregistering a sensor keeps what it measured (sensor_id becomes NULL); deleting a series
-- takes its sensors and measurements with it.
CREATE TABLE measurements (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    series_id   bigint NOT NULL REFERENCES series (id) ON DELETE CASCADE,
    sensor_id   bigint REFERENCES sensors (id) ON DELETE SET NULL,
    value       double precision NOT NULL,
    measured_at timestamptz NOT NULL, -- "timestamp" in the API
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX measurements_series_id_measured_at_idx ON measurements (series_id, measured_at);
