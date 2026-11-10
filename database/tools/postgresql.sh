#!/bin/bash
set -e

DB_NAME=$(cat /run/secrets/db_name)
DB_USER=$(cat /run/secrets/db_user)
DB_ADMIN=$(cat /run/secrets/db_admin)

DB_ROOT_PASSWORD=$(cat /run/secrets/db_root_password)
DB_ADMIN_PASSWORD=$(cat /run/secrets/db_admin_password)
DB_PASSWORD=$(cat /run/secrets/db_password)

mkdir -p /var/lib/postgresql/data
chown -R postgres:postgres /var/lib/postgresql

if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
    echo "No data found, initializing database ..."

    # init creates the PG_VERSION for the above if conditon
    su postgres -c "initdb -D /var/lib/postgresql/data"

    su postgres -c "pg_ctl -D /var/lib/postgresql/data -o '-c listen_addresses=localhost' -w start"

    echo "Creating database and users ..."

    su postgres -c "psql" <<SQL
ALTER USER postgres WITH PASSWORD '$DB_ROOT_PASSWORD';

CREATE DATABASE "$DB_NAME";

CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";

CREATE USER "$DB_ADMIN" WITH PASSWORD '$DB_ADMIN_PASSWORD' SUPERUSER;
SQL

    psql -U "$DB_ADMIN" -d "$DB_NAME" -f /caminho/init.sql

    echo "Stopping temporary PostgreSQL server ..."

    su postgres -c "pg_ctl -D /var/lib/postgresql/data -m fast -w stop"
fi

sed -i "s/^#listen_addresses =.*/listen_addresses = '*'/" /var/lib/postgresql/data/postgresql.conf
echo "host all all 0.0.0.0/0 scram-sha-256" >> /var/lib/postgresql/data/pg_hba.conf
echo "host all all ::/0 scram-sha-256" >> /var/lib/postgresql/data/pg_hba.conf

echo "Starting PostgreSQL ..."

exec su postgres -c "postgres -D /var/lib/postgresql/data"