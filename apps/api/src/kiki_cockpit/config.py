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
    eu_kiki_root: Path = Path.home() / "Documents" / "Projets" / "eu-kiki"

    # eu-kiki gateway
    eu_kiki_gateway_url: str = "http://localhost:9200"

    # HF
    hf_api_base: str = "https://huggingface.co/api"
    hf_token: str | None = None
    hf_owners: list[str] = Field(default_factory=lambda: ["clemsail", "electron-rare"])
    hf_sync_interval_seconds: int = 600  # 10 min

    # Featured config
    featured_path: Path = Path("featured.yaml")

    # Cache
    cache_dir: Path = Path.home() / ".cache" / "kiki-cockpit"


settings = Settings()
