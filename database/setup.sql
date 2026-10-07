-- Run this in MySQL Workbench or MySQL CLI before starting the backend

CREATE DATABASE IF NOT EXISTS email_crm_db;
USE email_crm_db;

-- Tables are auto-created by SQLAlchemy when you run the backend.
-- This script is just to ensure the database exists.

-- To verify, after running backend once, check:
-- SHOW TABLES;
-- You should see: companies, contacts, tasks, communications
