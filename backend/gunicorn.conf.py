# Gunicorn Configuration for Production
# Run with: gunicorn townbasket_backend.wsgi:application -c gunicorn.conf.py

import multiprocessing
import os

# ──────────────────────────────────────
# Server socket
# ──────────────────────────────────────
bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:8000')
backlog = 2048

# ──────────────────────────────────────
# Worker processes
# ──────────────────────────────────────
workers = int(os.environ.get('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 5
graceful_timeout = 30

# SECURITY: Restart workers periodically to prevent memory leaks
max_requests = 1000               # Restart worker after N requests
max_requests_jitter = 50          # Add randomness to prevent thundering herd

# ──────────────────────────────────────
# Process naming
# ──────────────────────────────────────
proc_name = 'townbasket'

# ──────────────────────────────────────
# Logging
# ──────────────────────────────────────
accesslog = '-'  # stdout
errorlog = '-'   # stderr
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sμs'

# ──────────────────────────────────────
# Security
# ──────────────────────────────────────
limit_request_line = 4094         # Max URL length
limit_request_fields = 100        # Max header fields
limit_request_field_size = 8190   # Max header size

# ──────────────────────────────────────
# Server mechanics
# ──────────────────────────────────────
daemon = False
pidfile = None
umask = 0o022
user = None
group = None
tmp_upload_dir = None

# Preload app for faster worker startup (shared memory)
preload_app = True

# ──────────────────────────────────────
# SSL (uncomment for HTTPS termination at Gunicorn)
# ──────────────────────────────────────
# keyfile = '/path/to/key.pem'
# certfile = '/path/to/cert.pem'

# ──────────────────────────────────────
# Hooks
# ──────────────────────────────────────
def on_starting(server):
    """Called just before the master process is initialized."""
    pass

def on_exit(server):
    """Called just before exiting Gunicorn."""
    pass

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def worker_int(worker):
    """Called when a worker receives SIGINT."""
    worker.log.info("Worker received INT signal")

def worker_exit(server, worker):
    """Called when a worker exits."""
    pass
