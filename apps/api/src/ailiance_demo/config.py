"""Application settings (from env + defaults)."""
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="COCKPIT_", env_file=".env", extra="ignore")

    # Service
    host: str = "127.0.0.1"
    port: int = 9100
    log_level: str = "INFO"

    # Paths to sibling repos (read-only sources)
    kiki_mac_tunner_root: Path = Path.home() / "Documents" / "Projets" / "KIKI-Mac_tunner"
    ailiance_root: Path = Path.home() / "Documents" / "Projets" / "ailiance"

    # ailiance gateway
    ailiance_gateway_url: str = "http://localhost:9200"

    # HF
    hf_api_base: str = "https://huggingface.co/api"
    hf_token: str | None = None
    hf_owners: list[str] = Field(default_factory=lambda: ["clemsail", "electron-rare"])
    hf_sync_interval_seconds: int = 600  # 10 min

    # Featured config
    featured_path: Path = Path("featured.yaml")

    # Cache
    cache_dir: Path = Path.home() / ".cache" / "ailiance-demo"

    # Training runs
    training_log_roots: list[Path] = Field(
        default_factory=lambda: [
            Path.home() / "Documents" / "Projets" / "KIKI-Mac_tunner" / "logs",
            Path.home() / "Documents" / "Projets" / "ailiance" / "logs",
        ],
    )
    machine_label: str = "studio"
    workers_to_check: list[dict] = Field(
        default_factory=lambda: [
            {"name": "gateway", "url": "http://host.docker.internal:9300/health"},
            {"name": "apertus", "url": "http://studio:9301/health"},
            {"name": "devstral", "url": "http://macm1:9302/health"},
            {"name": "eurollm", "url": "http://studio:9303/health"},
            {"name": "gemma3", "url": "http://tower:9304/health"},
            {"name": "qwen3-next", "url": "http://host.docker.internal:8002/health"},
        ],
    )


settings = Settings()
