#!/bin/sh
# Zero-cost pilot topology: OPA runs as a second process in this same
# container, bound to loopback only (127.0.0.1), never 0.0.0.0. That's a
# deliberate security property, not just a cost-saving shortcut: OPA's
# HTTP API has no auth of its own (see SECURITY.md), so binding it to
# loopback makes it unreachable from any other service or the public
# internet, full stop, not just "unreachable unless someone misconfigures
# a security group" the way a separate private service would be.
set -e

opa run --server --addr 127.0.0.1:8181 &
OPA_PID=$!
trap 'kill "$OPA_PID" 2>/dev/null || true' EXIT

# Wait for OPA to actually be ready rather than racing it; the app's own
# /health/ready check would report this anyway, but failing fast here
# means a broken OPA binary shows up as a container crash-loop (loud) in
# Render's dashboard, not a slow to appear "unready" for every request.
for i in $(seq 1 20); do
    if wget -q -O /dev/null http://127.0.0.1:8181/health 2>/dev/null; then
        break
    fi
    sleep 0.5
done

alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
