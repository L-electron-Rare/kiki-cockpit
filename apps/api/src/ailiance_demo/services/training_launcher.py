"""Generate training configs and dispatch them to the right host."""
from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass

import yaml
from pydantic import BaseModel


class LaunchRequest(BaseModel):
    base_model: str
    dataset_domain: str
    iters: int = 2000
    lora_rank: int = 32
    learning_rate: float = 5e-6
    max_seq_length: int = 3072
    batch_size: int = 1


@dataclass(frozen=True)
class LaunchInfo:
    run_id: str
    host: str
    yaml_path: str


class UnknownModelError(KeyError):
    """Raised when LaunchRequest references a base_model with no host mapping."""


_DATA_ROOT_PER_HOST: dict[str, str] = {
    "studio": "/Users/clems/ailiance/data/hf-traced",
    "macm1": "/Users/electron/lora-data-eukiki-curriculum",
}
_ADAPTER_ROOT_PER_HOST: dict[str, str] = {
    "studio": "/Users/clems/ailiance/output/adapters",
    "macm1": "/Users/electron/lora-adapters",
}
_HF_BASE_PER_MODEL: dict[str, str] = {
    "ailiance/mistral-medium-3.5-128b": (
        "/Users/clems/ailiance-mac-tuner/models/Mistral-Medium-3.5-128B-MLX-Q8"
    ),
    "ailiance/gemma4-e4b-curriculum": "lmstudio-community/gemma-4-E4B-it-MLX-4bit",
    "ailiance/eurollm-22b": "/Users/clems/ailiance-mac-tuner/models/EuroLLM-22B-Instruct-2512",
}


DEFAULT_HOST_FOR_MODEL: dict[str, str] = {
    "ailiance/mistral-medium-3.5-128b": "studio",
    "ailiance/gemma4-e4b-curriculum": "macm1",
    "ailiance/eurollm-22b": "studio",
}


Dispatcher = Callable[[str, str, str], None]
"""Dispatcher signature: (host, run_id, yaml_text) -> None"""


def _no_dispatch(host: str, run_id: str, yaml_text: str) -> None:
    """Default dispatcher: do nothing — the unit test path."""


class TrainingLauncher:
    def __init__(
        self,
        host_for_model: dict[str, str] = DEFAULT_HOST_FOR_MODEL,
        dispatcher: Dispatcher = _no_dispatch,
    ) -> None:
        self.host_for_model = host_for_model
        self.dispatcher = dispatcher

    def render_yaml(self, req: LaunchRequest) -> str:
        host = self._host_for(req.base_model)
        data_root = _DATA_ROOT_PER_HOST.get(host, "")
        adapter_root = _ADAPTER_ROOT_PER_HOST.get(host, "")
        model_path = _HF_BASE_PER_MODEL.get(req.base_model, req.base_model)
        cfg = {
            "model": model_path,
            "data": f"{data_root}/{req.dataset_domain}",
            "adapter_path": f"{adapter_root}/{req.dataset_domain}",
            "iters": req.iters,
            "batch_size": req.batch_size,
            "max_seq_length": req.max_seq_length,
            "learning_rate": req.learning_rate,
            "save_every": 200,
            "steps_per_report": 10,
            "steps_per_eval": 200,
            "val_batches": 5,
            "grad_checkpoint": True,
            "grad_accumulation_steps": 8,
            "lora_parameters": {
                "rank": req.lora_rank,
                "alpha": req.lora_rank,
                "dropout": 0.01,
                "scale": float(req.lora_rank),
            },
            "num_layers": 16,
            "seed": 42,
        }
        return yaml.safe_dump(cfg, sort_keys=False)

    def launch(self, req: LaunchRequest) -> LaunchInfo:
        host = self._host_for(req.base_model)
        yaml_text = self.render_yaml(req)
        run_id = f"{req.dataset_domain}-{int(time.time())}"
        yaml_path = f"/tmp/cockpit-launch-{run_id}.yaml"
        self.dispatcher(host, run_id, yaml_text)
        return LaunchInfo(run_id=run_id, host=host, yaml_path=yaml_path)

    def _host_for(self, base_model: str) -> str:
        if base_model not in self.host_for_model:
            raise UnknownModelError(base_model)
        return self.host_for_model[base_model]


import subprocess
import tempfile
from pathlib import Path


class SSHScreenDispatcher:
    """Dispatcher that scps the YAML to the target host and starts a screen session.

    Requires the api container to have an SSH key with passwordless access to
    the training hosts (mounted at /root/.ssh/id_ed25519, see compose).
    """

    def __init__(self, ssh_user: str = "electron") -> None:
        self.ssh_user = ssh_user
        self._ssh_opts = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"]

    def __call__(self, host: str, run_id: str, yaml_text: str) -> None:
        remote_yaml = f"/tmp/cockpit-{run_id}.yaml"
        remote_log = f"~/training-logs/{run_id}.log"
        with tempfile.NamedTemporaryFile(suffix=".yaml", delete=False) as fh:
            fh.write(yaml_text.encode())
            local_path = Path(fh.name)
        try:
            scp = subprocess.run(
                ["scp", *self._ssh_opts, str(local_path), f"{self.ssh_user}@{host}:{remote_yaml}"],
                capture_output=True,
            )
            if scp.returncode != 0:
                raise RuntimeError(f"scp failed: {scp.stderr.decode(errors='replace')}")
            cmd = (
                f"mkdir -p ~/training-logs && "
                f"screen -dmS {run_id} bash -c "
                f"'caffeinate -d -i mlx_lm.lora -c {remote_yaml} > {remote_log} 2>&1'"
            )
            ssh = subprocess.run(
                ["ssh", *self._ssh_opts, f"{self.ssh_user}@{host}", cmd],
                capture_output=True,
            )
            if ssh.returncode != 0:
                raise RuntimeError(f"ssh failed: {ssh.stderr.decode(errors='replace')}")
        finally:
            local_path.unlink(missing_ok=True)
