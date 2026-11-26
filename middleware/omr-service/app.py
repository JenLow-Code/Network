"""Private JenLow Optical Music Recognition API.

Only invokes Audiveris (real score-recognition engine). Never substitutes an LLM.
Container must be reachable only from the authenticated Cloudflare scan Worker.
"""
from __future__ import annotations

import base64
import binascii
import hmac
import io
import os
import pathlib
import subprocess
import tempfile
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from PIL import Image, ImageOps, UnidentifiedImageError

from musicxml import OMRInvalid, extract_xml, parse_score

MAX_IMAGE_BYTES = 4_000_000
MAX_PIXELS = 19_000_000
AUDIVERIS = os.environ.get("AUDIVERIS_BIN", "/opt/audiveris/bin/Audiveris")
AUDIVERIS_TIMEOUT = min(180, max(25, int(os.environ.get("OMR_TIMEOUT_SECONDS", "110"))))
API_SECRET = os.environ.get("OMR_API_SECRET", "")
app = FastAPI(title="JenLow Music OMR", version="0.1.0", docs_url=None, redoc_url=None)
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class ScanInput(BaseModel):
    image: str = Field(min_length=80, max_length=5_800_000)
    expectedStaves: int = Field(default=0, ge=0, le=24)
    expectedSystems: int = Field(default=0, ge=0, le=12)


@app.get("/health")
def health():
    return {"status": "ready" if API_SECRET and pathlib.Path(AUDIVERIS).exists() else "unconfigured",
            "engine": "audiveris", "available": bool(API_SECRET and pathlib.Path(AUDIVERIS).exists())}


def decode_image(data_url: str) -> bytes:
    if not data_url.startswith(("data:image/jpeg;base64,", "data:image/png;base64,",
                                "data:image/webp;base64,")):
        raise HTTPException(400, "Une image PNG, JPG ou WebP est nécessaire.")
    try:
        decoded = base64.b64decode(data_url.split(",", 1)[1], validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(400, "Image encodée invalide.") from exc
    if not decoded or len(decoded) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Photo trop volumineuse.")
    return decoded


def preprocess(raw: bytes) -> bytes:
    """Retain staff structure. Never use a hardcoded phone screenshot crop."""
    try:
        with Image.open(io.BytesIO(raw)) as im:
            im.load()
            if im.width * im.height > MAX_PIXELS:
                raise HTTPException(413, "Image trop grande.")
            rgb = ImageOps.exif_transpose(im).convert("RGB")
    except (UnidentifiedImageError, ValueError, OSError) as exc:
        raise HTTPException(422, "Image illisible.") from exc
    # Convert grey screenshots to a readable light page while preserving
    # black staff lines. Do not threshold away beams, accidentals or stems.
    grey = ImageOps.autocontrast(ImageOps.grayscale(rgb), cutoff=0.4)
    # Increase low-resolution mobile screenshots to a usable staff line size.
    if grey.width < 1300:
        scale = min(2.4, 1300 / grey.width)
        grey = grey.resize((round(grey.width * scale),
                            round(grey.height * scale)), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    grey.save(out, format="PNG", optimize=True)
    return out.getvalue()


def _run_audiveris(input_bytes: bytes) -> bytes:
    if not pathlib.Path(AUDIVERIS).is_file():
        raise HTTPException(503, "Le moteur OMR Audiveris n'est pas installé.")
    with tempfile.TemporaryDirectory(prefix="jenlow-omr-") as tmp:
        directory = pathlib.Path(tmp)
        source = directory / "original.png"
        dest = directory / "results"
        dest.mkdir()
        source.write_bytes(input_bytes)
        command = ["xvfb-run", "-a", AUDIVERIS, "-batch",
                   "-transcribe", "-export", "-output",
                   str(dest), "--", str(source)]
        try:
            run = subprocess.run(
                command, timeout=AUDIVERIS_TIMEOUT, check=False,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                cwd=tmp, env={**os.environ, "HOME": tmp},
            )
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(504, "Reconnaissance musicale trop longue.") from exc
        if run.returncode != 0:
            # Do not expose internal paths or application logs to users.
            raise HTTPException(422, "Audiveris n'a pas pu transcrire cette partition.")
        exported = list(dest.rglob("*.mxl")) + list(dest.rglob("*.musicxml"))
        if not exported:
            raise HTTPException(422, "Audiveris n'a pas produit de partition MusicXML.")
        exported.sort(key=lambda p: p.stat().st_size, reverse=True)
        target = exported[0]
        if target.stat().st_size > 16_000_000:
            raise HTTPException(413, "Fichier de partition convertie trop volumineux.")
        # Bytes are read before TemporaryDirectory wipes every server-side artifact.
        return extract_xml(target.read_bytes(), target.name)


def analyze_score(raw: bytes, expected_staves=0, expected_systems=0):
    xml = _run_audiveris(preprocess(raw))
    try:
        result = parse_score(xml)
    except OMRInvalid as exc:
        raise HTTPException(422, str(exc)) from exc
    # A complete score must be longer than a small cluster of chords; this is
    # a minimum sanity check, NEVER a substitute for musician verification.
    if expected_staves >= 4:
        clefs = {part["clef"] for part in result["parts"]}
        if not {"treble", "bass"}.issubset(clefs):
            raise HTTPException(422, "La clé de fa ou de sol manque dans l'export OMR.")
    if expected_systems >= 2 and result["measureCount"] < 4:
        raise HTTPException(422, "La partition numérisée paraît incomplète : mesures manquantes.")
    return result


@app.post("/v1/score")
def score(request: ScanInput, authorization: str | None = Header(default=None)):
    if not API_SECRET or len(API_SECRET) < 32:
        raise HTTPException(503, "Secret interne OMR non configuré.")
    supplied = (authorization or "").removeprefix("Bearer ")
    if not hmac.compare_digest(API_SECRET, supplied):
        raise HTTPException(401, "Non autorisé.")
    return analyze_score(decode_image(request.image),
                         request.expectedStaves, request.expectedSystems)
