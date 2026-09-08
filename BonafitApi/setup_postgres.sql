-- Run as a PostgreSQL superuser (psql -U postgres -f setup_postgres.sql)
CREATE USER bonafit WITH PASSWORD 'bonafit';
CREATE DATABASE bonafit OWNER bonafit;
GRANT ALL PRIVILEGES ON DATABASE bonafit TO bonafit;
