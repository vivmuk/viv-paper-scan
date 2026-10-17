#!/usr/bin/env python3
"""Guarded UI comp generator for viv-paper-scan. One writer per path, staged then os.replace.

Reused deliberately from the AI Council rig: the blank-render guard, the WEBP-to-PNG normalisation,
the sha256 sidecar. Everything that failed there failed loudly, and those guards are the reason.
"""
import base64, hashlib, io, json, os, pathlib, sys, time, urllib.request
from PIL import Image, ImageStat

ROOT = pathlib.Path.home()/"Projects/viv-paper-scan"
MOCKS = ROOT/".impeccable"/"mocks"
STAGE = MOCKS/"_staging"
LOGS = ROOT/"logs"
MODEL = "gpt-image-2-5-flare"

def _key():
    """Image generation needs the fleet key in ~/.hermes/.env; the secrets-file key is 401 on images."""
    for line in (pathlib.Path.home()/".hermes/.env").read_text().splitlines():
        if line.startswith("HERMES_CUSTOM_API_VENICE_AI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no image key in ~/.hermes/.env")

KEY = _key()
SIZES = {"phone": ("9:16", "1K", 600, 500), "desktop": ("16:9", "1K", 1200, 700)}

def post(prompt, aspect, resolution):
    body = json.dumps({"model": MODEL, "prompt": prompt, "aspect_ratio": aspect,
                       "resolution": resolution, "safe_mode": False}).encode()
    req = urllib.request.Request("https://api.venice.ai/api/v1/image/generate", data=body,
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def guard(raw, minw, minh):
    im = Image.open(io.BytesIO(raw)); sd = ImageStat.Stat(im.convert("L")).stddev[0]
    blank = len(raw) < 25000 or sd < 8 or im.size[0] < minw or im.size[1] < minh
    return (not blank), {"bytes": len(raw), "stddev": round(sd, 2), "size": list(im.size)}

def generate(name, prompt, kind):
    aspect, resolution, minw, minh = SIZES[kind]
    run = STAGE/f"{name}-{int(time.time())}"; run.mkdir(parents=True, exist_ok=True)
    history = []
    for attempt in range(1, 4):
        t0 = time.time()
        try:
            resp = post(prompt, aspect, resolution)
            imgs = resp.get("images") or resp.get("data") or []
            raw = base64.b64decode(imgs[0]) if imgs else b""
            if imgs and isinstance(imgs[0], str) and imgs[0].startswith("http"):
                with urllib.request.urlopen(imgs[0], timeout=300) as r: raw = r.read()
            im0 = Image.open(io.BytesIO(raw)); buf = io.BytesIO()
            im0.convert("RGB").save(buf, format="PNG"); raw = buf.getvalue()
        except Exception as e:
            history.append({"attempt": attempt, "error": str(e)[:300]}); print(f"  attempt {attempt}: ERROR {e}", flush=True); continue
        ok, nums = guard(raw, minw, minh)
        history.append({"attempt": attempt, **nums, "ok": ok, "seconds": round(time.time()-t0, 1)})
        print(f"  attempt {attempt}: {nums} ok={ok} {round(time.time()-t0,1)}s", flush=True)
        if ok:
            staged = run/f"{name}.png"; staged.write_bytes(raw)
            final = MOCKS/f"{name}.png"; os.replace(staged, final)
            side = {"name": name, "prompt": prompt, "model": MODEL, "aspect": aspect, "resolution": resolution,
                    "date": time.strftime("%Y-%m-%dT%H:%M:%S"), "attempts": attempt, "attempt_history": history,
                    "guard": nums, "qc": None, "sha256": hashlib.sha256(final.read_bytes()).hexdigest(), "kind": kind}
            (MOCKS/f"{name}.png.json").write_text(json.dumps(side, indent=1))
            print(f"  -> {final.name} sha256 {side['sha256'][:12]}", flush=True)
            return True
    print(f"  !! {name} failed all attempts", flush=True); return False

if __name__ == "__main__":
    LOGS.mkdir(exist_ok=True)
    spec = json.loads((MOCKS/"briefs.json").read_text())
    names = sys.argv[1:] or list(spec["briefs"])
    print(f"== generating {len(names)} comps from {MOCKS/'briefs.json'} ==", flush=True)
    ok = 0
    for n in names:
        kind = "desktop" if n.endswith("_desktop") else "phone"
        print(f"== {n} ({kind}) ==", flush=True)
        ok += generate(n, spec["world"] + " " + spec["briefs"][n], kind)
    print(f"== done: {ok}/{len(names)} rendered ==", flush=True)
