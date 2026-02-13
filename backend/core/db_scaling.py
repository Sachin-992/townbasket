"""
Database Connection Pooling — PgBouncer & Django Config
───────────────────────────────────────────────────────
Provides production-ready connection pooling configuration.

For PgBouncer: deploy alongside the Django app and point
DATABASES at PgBouncer instead of raw PostgreSQL.

PgBouncer config template included for reference.
"""


def get_pooled_db_config(database_url=None):
    """
    Return DATABASES config optimized for PgBouncer + Gunicorn.

    If PgBouncer is deployed:
      - Set DATABASE_URL to pgbouncer://host:6432/dbname
      - CONN_MAX_AGE = 0 (PgBouncer manages the pool)
      - DISABLE_SERVER_SIDE_CURSORS = True (required for transaction mode)

    If direct PostgreSQL:
      - CONN_MAX_AGE = 600 (Django manages persistent connections)
      - CONN_HEALTH_CHECKS = True
    """
    import os
    import dj_database_url

    url = database_url or os.environ.get('DATABASE_URL', '')
    if not url:
        return None

    use_pgbouncer = os.environ.get('USE_PGBOUNCER', 'false').lower() == 'true'

    db_config = dj_database_url.parse(url)

    if use_pgbouncer:
        # PgBouncer manages the pool — Django should NOT hold connections
        db_config.update({
            'CONN_MAX_AGE': 0,
            'CONN_HEALTH_CHECKS': False,
            'DISABLE_SERVER_SIDE_CURSORS': True,  # Required for PgBouncer transaction mode
            'OPTIONS': {
                'connect_timeout': 5,
                'options': '-c statement_timeout=30000',  # 30s query timeout
            },
        })
    else:
        # Direct PostgreSQL — use Django's persistent connections
        db_config.update({
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'connect_timeout': 5,
                'options': '-c statement_timeout=30000',  # 30s query timeout
            },
        })

    return db_config


# ── PgBouncer Configuration Reference ─────────────
PGBOUNCER_INI_TEMPLATE = """
; PgBouncer configuration for TownBasket
; Deploy: /etc/pgbouncer/pgbouncer.ini

[databases]
townbasket = host=<DB_HOST> port=5432 dbname=<DB_NAME>

[pgbouncer]
; Connection pool settings
pool_mode = transaction          ; Best for Django (no server-side cursors)
max_client_conn = 500            ; Max clients connecting to PgBouncer
default_pool_size = 25           ; Connections per database
min_pool_size = 5                ; Keep minimum warm connections
reserve_pool_size = 5            ; Extra connections for bursts
reserve_pool_timeout = 3         ; Wait before using reserve pool

; Timeouts
server_connect_timeout = 5
server_login_retry = 3
query_timeout = 30               ; Kill queries over 30 seconds
query_wait_timeout = 120         ; Max time a client waits for a connection
client_idle_timeout = 300        ; Close idle client connections after 5 min

; Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60

; Security
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Admin
listen_addr = 127.0.0.1
listen_port = 6432
admin_users = postgres
"""
