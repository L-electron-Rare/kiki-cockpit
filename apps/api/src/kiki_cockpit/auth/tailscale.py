"""Tailscale-User header dependency.

In production:
- nginx on electron-server validates Tailscale auth and injects X-Tailscale-User
- studio :9100 firewall only accepts traffic from electron-server's tailnet IP
- so this header is trusted as long as the firewall holds

In tests, the header is supplied directly.
"""
from fastapi import Header, HTTPException


def require_tailscale_user(
    x_tailscale_user: str | None = Header(default=None, alias="X-Tailscale-User"),
) -> str:
    if not x_tailscale_user or not x_tailscale_user.strip():
        raise HTTPException(
            status_code=401,
            detail="X-Tailscale-User header missing or empty",
        )
    return x_tailscale_user.strip()
