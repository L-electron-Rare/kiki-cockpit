#!/usr/bin/env python3
"""Fetch HF catalog for electron-rare + Ailiance-fr orgs into static JSON."""
import json
import urllib.request
import datetime as dt
import sys


def fetch(org: str):
    url = f"https://huggingface.co/api/models?author={org}&limit=300&full=true"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def main(out_path: str):
    out = []
    for org in ["electron-rare", "Ailiance-fr"]:
        for m in fetch(org):
            tags = m.get("tags") or []
            out.append({
                "modelId": m.get("id"),
                "org": org,
                "lastModified": m.get("lastModified") or m.get("createdAt"),
                "createdAt": m.get("createdAt"),
                "downloads": m.get("downloads", 0),
                "likes": m.get("likes", 0),
                "private": m.get("private", False),
                "pipeline_tag": m.get("pipeline_tag"),
                "library_name": m.get("library_name"),
                "tags": [
                    t for t in tags
                    if not t.startswith(("region:", "base_model:adapter:"))
                ][:12],
            })

    def sort_key(x):
        ts = x["lastModified"] or ""
        return (x["org"], ts)

    out.sort(key=sort_key, reverse=False)
    # Then sort within org by lastModified desc
    out.sort(key=lambda x: (x["org"], -(int(
        (x["lastModified"] or "0").replace("-", "").replace(":", "").replace("T", "").replace("Z", "").split(".")[0]
    ) if x["lastModified"] else 0)))

    payload = {
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "orgs": {
            "electron-rare": sum(1 for m in out if m["org"] == "electron-rare"),
            "Ailiance-fr": sum(1 for m in out if m["org"] == "Ailiance-fr"),
        },
        "models": out,
    }
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    er = payload["orgs"]["electron-rare"]
    ai = payload["orgs"]["Ailiance-fr"]
    print(f"Wrote {len(out)} models to {out_path}")
    print(f"  electron-rare: {er}")
    print(f"  Ailiance-fr: {ai}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "hf-catalog.json")
