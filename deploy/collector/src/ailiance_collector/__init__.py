"""ailiance-collector: read-only filesystem-over-HTTP shim for the ailiance-demo API.

Runs on the host that owns training logs and eval results (studio).
The cockpit API on electron-server polls these endpoints over Tailscale.
"""

__version__ = "0.1.0"
