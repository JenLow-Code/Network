"""MusicXML parser for the JenLow OMR service.

Keeps independent parts, clefs, staves and voices, including <backup>/<forward>.
No pitches are invented: events derive exclusively from Audiveris MusicXML.
"""
from __future__ import annotations

import io
import math
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from typing import Any

MAX_XML_BYTES = 4_000_000
MAX_EVENTS = 20_000
STEPS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
SHARPS = "FCGDAEB"
FLATS = "BEADGCF"


class OMRInvalid(Exception):
    pass


def _children(element: ET.Element, kind: str):
    return [child for child in element if child.tag.rsplit("}", 1)[-1] == kind]


def _child(element: ET.Element | None, kind: str):
    if element is None:
        return None
    return next(iter(_children(element, kind)), None)


def _text(element: ET.Element | None, tag: str, fallback: str = ""):
    child = _child(element, tag)
    return (child.text or "").strip() if child is not None else fallback


def _int(element: ET.Element | None, tag: str, fallback: int) -> int:
    try:
        return int(_text(element, tag, str(fallback)))
    except ValueError:
        return fallback


def extract_xml(payload: bytes, filename: str) -> bytes:
    """Audiveris normally exports .mxl, a ZIP containing a MusicXML rootfile."""
    if len(payload) > 16_000_000:
        raise OMRInvalid("Export Audiveris trop volumineux.")
    if not zipfile.is_zipfile(io.BytesIO(payload)):
        if len(payload) > MAX_XML_BYTES:
            raise OMRInvalid("Partition XML trop volumineuse.")
        return payload
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        files = [f for f in archive.infolist() if
                 f.filename.lower().endswith((".musicxml", ".xml")) and
                 not f.filename.startswith(("META-INF/", "/")) and
                 ".." not in f.filename.split("/")]
        if not files:
            raise OMRInvalid("Aucun MusicXML lisible dans l'archive.")
        chosen = files[0]
        if chosen.file_size > MAX_XML_BYTES:
            raise OMRInvalid("MusicXML décompressé trop volumineux.")
        data = archive.read(chosen, pwd=None)
        if len(data) > MAX_XML_BYTES:
            raise OMRInvalid("MusicXML décompressé trop volumineux.")
        return data


def parse_score(xml_bytes: bytes) -> dict[str, Any]:
    if len(xml_bytes) > MAX_XML_BYTES or b"<!DOCTYPE" in xml_bytes.upper() or b"<!ENTITY" in xml_bytes.upper():
        raise OMRInvalid("MusicXML externe ou trop volumineux interdit.")
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        raise OMRInvalid("MusicXML invalide.") from exc
    if root.tag.rsplit("}", 1)[-1] != "score-partwise":
        raise OMRInvalid("Format MusicXML score-partwise requis.")
    part_list = _child(root, "part-list")
    names = {p.attrib.get("id", ""): _text(p, "part-name", "Instrument")
             for p in _children(part_list, "score-part")} if part_list is not None else {}
    xmlparts = _children(root, "part")
    if not 1 <= len(xmlparts) <= 20:
        raise OMRInvalid("Nombre de parties invalide.")

    title = _text(_child(root, "work"), "work-title") or _text(root, "movement-title") or "Partition numérisée"
    events: list[dict[str, Any]] = []
    parts: dict[str, dict[str, Any]] = {}
    warnings = ["Reconnaissance OMR : compare les mesures, liaisons et rythmes avec l'original."]
    numerator, denominator = 4, 4
    bpm = None
    master_metre_set = False
    all_measures = 0

    for part_idx, xmlpart in enumerate(xmlparts):
        pid = xmlpart.attrib.get("id") or f"P{part_idx+1}"
        label = names.get(pid, f"Partie {part_idx+1}")
        divisions = 1
        fifths = 0
        staves: dict[int, str] = {1: "treble"}
        metre = (4, 4)
        measure_start = 0.0
        tie_open: dict[tuple[int, str, int], dict[str, Any]] = {}
        measures = _children(xmlpart, "measure")
        all_measures = max(all_measures, len(measures))

        for measure_i, measure in enumerate(measures):
            cursor = 0.0
            last_start = 0.0
            content_end = 0.0
            for item in measure:
                tag = item.tag.rsplit("}", 1)[-1]
                if tag == "attributes":
                    new_div = _int(item, "divisions", divisions)
                    if new_div > 0:
                        divisions = new_div
                    key = _child(item, "key")
                    if key is not None:
                        fifths = max(-7, min(7, _int(key, "fifths", fifths)))
                    time = _child(item, "time")
                    if time is not None:
                        n, d = _int(time, "beats", metre[0]), _int(time, "beat-type", metre[1])
                        if 1 <= n <= 32 and d in (1, 2, 4, 8, 16, 32):
                            metre = (n, d)
                            if not master_metre_set:
                                numerator, denominator = n, d
                                master_metre_set = True
                    for clef in _children(item, "clef"):
                        number = int(clef.attrib.get("number", "1"))
                        sign = _text(clef, "sign")
                        if sign in ("G", "F", "C"):
                            staves[number] = {"G": "treble", "F": "bass", "C": "alto"}[sign]
                    continue
                if tag == "direction":
                    sound = _child(item, "sound")
                    if sound is not None and bpm is None:
                        try:
                            value = float(sound.attrib.get("tempo", ""))
                            if 20 <= value <= 300:
                                bpm = round(value)
                        except ValueError:
                            pass
                    continue
                if tag in ("backup", "forward"):
                    duration = _int(item, "duration", 0) / divisions
                    cursor = max(0.0, cursor - duration if tag == "backup" else cursor + duration)
                    content_end = max(content_end, cursor)
                    continue
                if tag != "note":
                    continue
                chord = _child(item, "chord") is not None
                rest = _child(item, "rest") is not None
                grace = _child(item, "grace") is not None
                length = max(0, _int(item, "duration", 0) / divisions)
                start = last_start if chord else cursor
                if not chord:
                    last_start = start
                content_end = max(content_end, start + length)
                if not chord:
                    cursor += length
                if rest or grace or length <= 0:
                    continue
                pitch = _child(item, "pitch")
                if pitch is None:
                    continue
                step = _text(pitch, "step")
                if step not in STEPS:
                    continue
                octave = _int(pitch, "octave", -2)
                altered = _text(pitch, "alter", "")
                if altered:
                    try:
                        alteration = round(float(altered))
                    except ValueError:
                        alteration = 0
                elif fifths > 0 and step in SHARPS[:fifths]:
                    alteration = 1
                elif fifths < 0 and step in FLATS[:-fifths]:
                    alteration = -1
                else:
                    alteration = 0
                midi = 12 * (octave + 1) + STEPS[step] + alteration
                if not 0 <= midi <= 127:
                    continue
                staff = _int(item, "staff", 1)
                voice = _text(item, "voice", "1")
                track_id = f"{pid}:staff-{staff}:voice-{voice}"
                clef = staves.get(staff, "treble")
                if track_id not in parts:
                    role = ("Main gauche / basse" if clef == "bass" else
                            "Voix / main droite" if clef == "treble" else label)
                    parts[track_id] = {"id": track_id, "name": role, "originalPart": label,
                                       "staff": staff, "voice": voice, "clef": clef,
                                       "noteCount": 0}
                tie = {t.attrib.get("type") for t in _children(item, "tie")}
                ev: dict[str, Any] = {
                    "id": f"omr-{len(events)}", "instrument": "piano", "midi": midi,
                    "velocity": 90, "startBeats": round(measure_start+start, 4),
                    "lengthBeats": round(length, 4), "scorePartId": track_id,
                    "scoreStaff": staff, "scoreVoice": voice, "scoreClef": clef,
                    "scoreMeasure": measure_i+1,
                }
                tie_key = (staff, voice, midi)
                if "stop" in tie and tie_key in tie_open:
                    existing = tie_open[tie_key]
                    existing["lengthBeats"] = round(
                        max(existing["startBeats"]+existing["lengthBeats"],
                            ev["startBeats"]+ev["lengthBeats"]) - existing["startBeats"], 4)
                    if "start" not in tie:
                        tie_open.pop(tie_key, None)
                    continue
                events.append(ev)
                parts[track_id]["noteCount"] += 1
                if "start" in tie:
                    tie_open[tie_key] = ev
                if len(events) > MAX_EVENTS:
                    raise OMRInvalid("La partition dépasse la limite de notes.")
            measure_beats = metre[0] * 4 / metre[1]
            # A full measure must retain its duration even if it contains a whole rest
            # or sparse notes; a pickup is a legitimate shorter first measure.
            measure_start += content_end if measure_i == 0 and content_end < measure_beats else max(measure_beats, content_end)
        if tie_open:
            warnings.append("Certaines liaisons de prolongation ne sont pas fermées.")

    events.sort(key=lambda e: (e["startBeats"], e["scorePartId"], e["midi"]))
    if not events:
        raise OMRInvalid("Aucune note exportée par le moteur OMR.")
    has_treble = any(part["clef"] == "treble" for part in parts.values())
    has_bass = any(part["clef"] == "bass" for part in parts.values())
    if not has_treble or not has_bass:
        warnings.append("Clés de sol et de fa non toutes deux reconnues : vérifie les portées.")
    if bpm is None:
        warnings.append("Le tempo est absent de la partition : lecture provisoire à 100 BPM.")
    xml_text = xml_bytes.decode("utf-8-sig", errors="replace")
    return {
        "mode": "score", "title": title[:120], "musicXml": xml_text,
        "notes": events, "parts": list(parts.values()),
        "numerator": numerator, "denominator": denominator, "bpm": bpm,
        "measureCount": all_measures, "warnings": list(dict.fromkeys(warnings)),
        "engine": "audiveris", "status": "needs_review",
    }
