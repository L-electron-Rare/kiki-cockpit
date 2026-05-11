"""Authenticated-user header dependency for admin routes.

Since the Keycloak SSO migration (May 2026), admin.ailiance.fr is gated
by Traefik's ``oidc-auth@docker`` forward-auth middleware which injects
``X-Forwarded-User`` (the authenticated email from Keycloak realm
``electron_rare``). The legacy ``X-Tailscale-User`` header is still
accepted as a fallback so existing tests and the studio :9100 backend
(firewalled to the tailnet) keep working without a test-suite rewrite.

Trust model:
- Production gateway (admin.ailiance.fr): forward-auth strips any client-
  supplied ``X-Forwarded-User`` and re-injects the verified value, so the
  header is trustworthy as long as Traefik holds.
- Direct backend access (studio :9100): firewalled to the tailnet, so any
  request reaching the API is already a tailnet device.
"""
from fastapi import Header, HTTPException


def require_tailscale_user(
    x_forwarded_user: str | None = Header(default=None, alias="X-Forwarded-User"),
    x_tailscale_user: str | None = Header(default=None, alias="X-Tailscale-User"),
) -> str:
    """Return the authenticated user identifier.

    Function name kept for backwards-compat across 7 admin routers + 6
    test files; semantics now cover both Keycloak SSO (preferred) and the
    legacy tailnet header.
    """
    user = (x_forwarded_user or x_tailscale_user or "").strip()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="X-Forwarded-User or X-Tailscale-User header missing",
        )
    return user
