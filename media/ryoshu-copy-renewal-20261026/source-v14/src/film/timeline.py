"""Absolute timeline from the EDL + capture timestamps. Pure computation (no images)."""
from __future__ import annotations

from .edl import CHAPTERS, GRAPHICS_AFTER, GRAPHICS_BEFORE, LOCAL_SHOT
from .footage import frames, pointer

FPS = 30
CAP_LEAD = 0.0


def _shot_len(sh):
    fr = frames(sh["chunk"])
    span = fr[sh["b"]]["t"] - fr[sh["a"]]["t"]
    return sh.get("head_hold", 0.0) + span / sh.get("speed", 1.0) + sh.get("tail_hold", 0.0), span


def src_time(sh, rel):
    """Output-relative seconds -> source timestamp (sample-and-hold)."""
    fr = frames(sh["chunk"])
    t0, t1 = fr[sh["a"]]["t"], fr[sh["b"]]["t"]
    rel -= sh.get("head_hold", 0.0)
    if rel <= 0:
        return t0
    return min(t1, t0 + rel * sh.get("speed", 1.0))


def frame_out_rel(sh, i):
    """Output-relative time at which frame i first appears in this shot."""
    fr = frames(sh["chunk"])
    if i <= sh["a"]:
        return 0.0
    return sh.get("head_hold", 0.0) + (fr[i]["t"] - fr[sh["a"]]["t"]) / sh.get("speed", 1.0)


def build():
    t = 0.0
    scenes, shots, events, captions, marks = [], [], [], [], []

    def graphic(name, dur):
        nonlocal t
        scenes.append({"id": name, "kind": "graphic", "out": [round(t, 4), round(t + dur, 4)]})
        t += dur

    def footage(scene_id, sh, k):
        nonlocal t
        dur, span = _shot_len(sh)
        start = t
        rec = {"scene": scene_id, "n": k, "chunk": sh["chunk"], "a": sh["a"], "b": sh["b"], "speed": sh.get("speed", 1.0),
               "head_hold": sh.get("head_hold", 0.0), "tail_hold": sh.get("tail_hold", 0.0), "src_span_s": round(span, 4),
               "src_t": [frames(sh["chunk"])[sh["a"]]["t"], frames(sh["chunk"])[sh["b"]]["t"]],
               "frames": [pointer(sh["chunk"], sh["a"]), pointer(sh["chunk"], sh["b"])], "out": [round(start, 4), round(start + dur, 4)],
               "cam": sh["cam"], "cut_before": sh.get("cut_before"), "badge_speed": sh.get("speed") if sh.get("badge") else None,
               "time_skip": sh.get("time_skip", False), "note": sh.get("note"), "spec": sh}
        shots.append(rec)
        for ev, fi, sfx in sh.get("events", []):
            events.append({"id": ev, "scene": scene_id, "chunk": sh["chunk"], "frame": fi, "frame_pointer": pointer(sh["chunk"], fi),
                           "src_t": frames(sh["chunk"])[fi]["t"], "out_t": round(start + frame_out_rel(sh, fi), 4), "sfx": sfx,
                           "detection": "first frame whose grayscale diff vs the previous frame exceeds 24 inside the event region (build/analysis/changes.json); verified visually"})
        if sh.get("caption"):
            at = start + (frame_out_rel(sh, sh["caption_at"]) if "caption_at" in sh else 0.0)
            captions.append({"slot": sh["caption"], "scene": scene_id, "start": round(at + CAP_LEAD, 4), "end": None,
                             "gate_event": next((e for e, f, _ in sh.get("events", []) if f == sh.get("caption_at")), None)})
        for rect, f0, f1, delay in sh.get("marks", []):
            a = start + frame_out_rel(sh, max(f0, sh["a"])) + delay
            b = start + (frame_out_rel(sh, f1 + 1) if f1 is not None and f1 + 1 <= sh["b"] else dur)
            marks.append({"scene": scene_id, "shot": len(shots) - 1, "rect": list(rect), "frames": [f0, f1], "out": [round(a, 4), round(b, 4)],
                          "frame_pointer": pointer(sh["chunk"], max(f0, sh["a"]))})
        t += dur

    for name, dur in GRAPHICS_BEFORE:
        if name == "local":
            s0 = t
            footage("local", LOCAL_SHOT, 0)
            scenes.append({"id": "local", "kind": "footage", "out": [round(s0, 4), round(t, 4)]})
        else:
            graphic(name, dur)
    for cid, num, lab, shs in CHAPTERS:
        s0 = t
        for k, sh in enumerate(shs):
            footage(cid, sh, k)
        scenes.append({"id": cid, "kind": "footage", "out": [round(s0, 4), round(t, 4)], "chapter": [num, lab]})
    for name, dur in GRAPHICS_AFTER:
        graphic(name, dur)
    scenes.sort(key=lambda s: s["out"][0])
    for i, c in enumerate(captions):
        nxt = next((d for d in captions[i + 1:] if d["scene"] == c["scene"]), None)
        end = nxt["start"] if nxt else next(s["out"][1] for s in scenes if s["id"] == c["scene"])
        c["end"] = round(end, 4)
    return {"duration": round(t, 4), "scenes": scenes, "shots": shots, "events": events, "captions": captions, "marks": marks}
