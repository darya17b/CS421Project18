-- SQLite schema for project actor records
-- Run with: sqlite3 actor.db ".read actor_schema.sql"

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS actors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (trim(name) <> ''),
    email TEXT NOT NULL UNIQUE CHECK (trim(email) <> ''),
    notes TEXT CHECK (notes IS NULL OR length(notes) <= 100),
    phone_number TEXT NOT NULL CHECK (trim(phone_number) <> ''),
    age_range TEXT,
    pronouns TEXT,
    employee_id TEXT NOT NULL UNIQUE
        CHECK (employee_id GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    workday_name TEXT NOT NULL CHECK (trim(workday_name) <> ''),
    time_code TEXT NOT NULL
        CHECK (trim(time_code) <> '' AND time_code GLOB '[0-9-]*'),
    lead_time_code TEXT
        CHECK (lead_time_code IS NULL OR (length(lead_time_code) > 0 AND lead_time_code GLOB '[0-9]*')),
    specialized_time_code TEXT
        CHECK (specialized_time_code IS NULL OR (length(specialized_time_code) > 0 AND specialized_time_code GLOB '[0-9]*')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_actors_name ON actors(name);
CREATE INDEX IF NOT EXISTS idx_actors_workday_name ON actors(workday_name);
