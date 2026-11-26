"""Contract tests: note timestamps and clefs from MusicXML, never AI guesses."""
from __future__ import annotations

import io
import os
import sys
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as omr_app
from musicxml import extract_xml, parse_score, OMRInvalid


XML = b"""<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <work><work-title>Je suis heureux - TEST STRUCTUREL</work-title></work>
  <part-list><score-part id="P1"><part-name>Piano / chant</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions><key><fifths>1</fifths></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration>
      <voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration>
      <voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>
      <voice>1</voice><type>quarter</type><staff>1</staff></note>
      <backup><duration>12</duration></backup>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>8</duration>
      <voice>2</voice><type>half</type><staff>2</staff></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration>
      <voice>2</voice><type>quarter</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration>
        <voice>1</voice><type>half</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>
        <voice>1</voice><type>quarter</type><staff>1</staff></note>
      <backup><duration>12</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>12</duration>
        <voice>2</voice><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="3">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration>
        <voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration>
        <voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><alter>1</alter><octave>5</octave></pitch><duration>4</duration>
        <voice>1</voice><type>quarter</type><staff>1</staff></note>
      <backup><duration>12</duration></backup>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>12</duration>
        <voice>2</voice><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="4">
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>12</duration>
        <voice>1</voice><type>half</type><dot/><staff>1</staff></note>
      <backup><duration>12</duration></backup>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>12</duration>
        <voice>2</voice><type>half</type><dot/><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>"""


def test_two_staff_two_voice_transcription_kept_independent():
    data = parse_score(XML)
    assert data["mode"] == "score"
    assert data["numerator"] == 3 and data["denominator"] == 4
    assert data["measureCount"] == 4
    assert data["status"] == "needs_review"
    assert len(data["parts"]) == 2
    assert {part["clef"] for part in data["parts"]} == {"treble", "bass"}
    treble = [e for e in data["notes"] if e["scoreStaff"] == 1]
    bass = [e for e in data["notes"] if e["scoreStaff"] == 2]
    assert [n["midi"] for n in treble[:3]] == [67, 69, 71]
    assert [n["midi"] for n in bass[:2]] == [43, 50]
    assert treble[0]["startBeats"] == bass[0]["startBeats"] == 0
    assert treble[3]["startBeats"] == 3
    assert bass[2]["startBeats"] == 3
    assert treble[-1]["startBeats"] == 9
    assert all(n["scorePartId"] and n["scoreMeasure"] >= 1 for n in data["notes"])


def test_mxl_is_unzipped_not_treated_as_an_image():
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as z:
        z.writestr("META-INF/container.xml", "<container/>")
        z.writestr("score.xml", XML)
    assert extract_xml(stream.getvalue(), "score.mxl") == XML


def test_external_entity_and_empty_score_are_rejected():
    with pytest.raises(OMRInvalid):
        parse_score(b'<!DOCTYPE x [<!ENTITY x "bad">]>' + XML)
    with pytest.raises(OMRInvalid):
        parse_score(b"<score-partwise></score-partwise>")


def test_backend_requires_authentication(monkeypatch):
    monkeypatch.setattr(omr_app, "API_SECRET", "s" * 40)
    client = TestClient(omr_app.app)
    response = client.post("/v1/score", json={
        "image": "data:image/png;base64," + "a" * 90
    })
    assert response.status_code == 401


def test_audiveris_output_not_an_llm_guess(monkeypatch):
    monkeypatch.setattr(omr_app, "_run_audiveris", lambda _: XML)
    monkeypatch.setattr(omr_app, "preprocess", lambda _: b"normalized.png")
    data = omr_app.analyze_score(b"image.png", expected_staves=4, expected_systems=2)
    assert data["engine"] == "audiveris"
    assert {p["clef"] for p in data["parts"]} == {"treble", "bass"}
    assert len(data["notes"]) == 14


def test_rejects_incomplete_staff_exports(monkeypatch):
    monkeypatch.setattr(omr_app, "_run_audiveris", lambda _: XML.replace(
        b"<sign>F</sign>", b"<sign>G</sign>"))
    monkeypatch.setattr(omr_app, "preprocess", lambda _: b"normalized.png")
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as err:
        omr_app.analyze_score(b"image.png", expected_staves=4)
    assert err.value.status_code == 422


def test_no_binary_prevents_fake_recognition(monkeypatch):
    monkeypatch.setattr(omr_app, "AUDIVERIS", "/nonexistent/audiveris")
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as err:
        omr_app._run_audiveris(b"png")
    assert err.value.status_code == 503
