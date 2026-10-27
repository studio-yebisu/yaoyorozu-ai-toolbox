"""Edit decision list (Opus). Every footage shot is genuine capture frames; times are computed from frames.jsonl.

Shot fields
  chunk, a, b      : frame index range played sample-and-hold at `speed` (source seconds / output seconds)
  head_hold        : seconds the first frame (a) is held before playback (explicit hold of a genuine frame)
  tail_hold        : seconds the last frame (b) is held after playback
  cam              : [(rel_s, cx, cy, crop_w)] in source px
  caption          : Kimi slot; starts at shot start, or at `caption_at` event frame
  marks            : (rect source px, from_frame, to_frame or None, delay_s) - ring shown only while a frame in
                     [from_frame, to_frame] is on screen (per-state geometry), starting `delay_s` after it appears
  events           : (event id, first-visible frame index, sfx) - detected by frame differencing (build/analysis)
  badge            : speed badge (x = speed, computed) ; cut_before: capture discontinuity before this shot
Rects were measured on the named frames (see build/analysis + edit manifest); DOM rects come from
input/new-ui/account-dialog-bounds.json and review-checkbox-bounds.json and were verified against their frames.
"""

FULL = [(0.0, 640, 360, 1280)]

CH01 = [
    dict(chunk="A0-empty-home", a=0, b=0, tail_hold=4.6, cam=[(0, 640, 380, 1180), (4.6, 640, 370, 1120)], caption="caption.01.select",
         marks=[((178, 219, 910, 232), 0, None, 0.5)]),
    dict(chunk="A1-select-files", a=0, b=2, speed=1.0, tail_hold=3.5, cam=[(0, 640, 400, 1120), (3.3, 640, 470, 1000)], caption="caption.01.selected",
         marks=[((176, 468, 464, 22), 2, None, 0.2), ((794, 561, 208, 44), 2, None, 1.3)], cut_before="A0->A1 capture gap 2.0 s"),
    dict(chunk="A2-start-and-process", a=0, b=66, speed=1.0, tail_hold=2.4, cam=[(0, 640, 400, 1120), (3.7, 640, 360, 1280)],
         caption="caption.01.process.v14", caption_at=2, events=[("ch01.start", 2, "click")],
         marks=[((172, 200, 270, 26), 2, 65, 0.0)], cut_before="A1->A2 capture gap 9.3 s"),
    dict(chunk="A2-start-and-process", a=66, b=200, speed=1.0, tail_hold=1.4, cam=[(0, 640, 360, 1280), (1.0, 640, 420, 1060)],
         caption="caption.01.twosteps", caption_at=81, events=[("ch01.step", 81, "tick")],
         marks=[((260, 465, 204, 22), 81, None, 0.0)]),
    dict(chunk="A2-start-and-process", a=200, b=1171, speed=8.0, cam=[(0, 640, 420, 1060), (3.2, 640, 400, 1120)], badge=True),
    dict(chunk="A3-completion", a=0, b=361, speed=8.0, cam=[(0, 640, 400, 1120)], badge=True, cut_before="A2->A3 capture gap 44.8 s"),
    dict(chunk="A4-all-done", a=0, b=611, speed=8.0, cam=[(0, 640, 400, 1120)], badge=True, cut_before="A3->A4 capture gap 4.2 s",
         note="still 4/5 (V044 candidate step); folder name is misleading"),
    dict(chunk="A5-completed", a=0, b=0, tail_hold=4.4, cam=FULL, caption="caption.01.done",
         time_skip=True, cut_before="A4->A5 capture gap 130.9 s: not recorded, completion of V044 is not shown",
         marks=[((1034, 210, 62, 54), 0, None, 0.3), ((172, 656, 610, 22), 0, None, 1.2), ((172, 687, 152, 33), 0, None, 2.0)]),
]

CH02 = [
    dict(chunk="02-results", a=0, b=7, speed=1.0, tail_hold=4.3, cam=FULL, caption="caption.02.results",
         marks=[((24, 244, 1216, 46), 7, None, 0.4)]),
    dict(chunk="09-original-zoom", a=0, b=5, speed=1.0, tail_hold=0.8, cam=FULL, caption="caption.02.zoom"),
    dict(chunk="10-zoom-scale", a=0, b=1, speed=1.0, tail_hold=3.6, cam=FULL, marks=[((1028, 116, 134, 40), 1, None, 0.3)]),
    dict(chunk="11-read-text", a=0, b=3, speed=1.0, tail_hold=3.4, cam=[(0, 640, 360, 1280), (1.2, 600, 470, 1000)], caption="caption.02.rawtext",
         marks=[((184, 440, 812, 280), 3, None, 0.6)], note="raw OCR text shown as captured, including a misread line"),
]

CH03 = [
    dict(chunk="03-open-account", a=2, b=2, tail_hold=1.8, cam=[(0, 760, 420, 1100)], caption="caption.03.held",
         marks=[((1032, 364, 192, 72), 2, 4, 0.2)], note="explicit hold of the genuine hover frame on V002 '科目を選ぶ' (captured for ~50 ms)"),
    dict(chunk="03-open-account", a=2, b=6, speed=1.0, tail_hold=2.0, cam=[(0, 760, 420, 1100), (0.6, 640, 405, 1110)]),
    dict(chunk="04-select-category", a=0, b=1, speed=1.0, tail_hold=1.4, cam=[(0, 640, 405, 1110)], caption="caption.03.account",
         marks=[((379, 384, 247, 42), 1, None, 0.1)]),
    dict(chunk="05-select-account", a=0, b=1, speed=1.0, tail_hold=2.4, cam=[(0, 640, 405, 1110)],
         marks=[((379.5, 370.390625, 245, 40), 1, None, 0.0), ((640.5, 372.390625, 195, 40), 1, None, 0.4)]),
    dict(chunk="06-favorite-on", a=0, b=3, speed=1.0, tail_hold=3.2, cam=[(0, 640, 405, 1110)], caption="caption.03.star_add", caption_at=3,
         events=[("ch03.star_on", 3, "click")],
         marks=[((840, 394, 44, 44), 3, None, 0.0), ((378, 316, 96, 36), 3, None, 0.35), ((500, 654, 264, 38), 3, None, 0.7)]),
    dict(chunk="07-favorite-off", a=0, b=2, speed=1.0, head_hold=0.9, tail_hold=3.0, cam=[(0, 640, 405, 1110)], caption="caption.03.star_remove", caption_at=2,
         events=[("ch03.star_off", 2, "click")], note="frames 0-1 show the FILLED star; frame 2 is the first empty-star frame",
         marks=[((841.5, 370.390625, 44, 44), 2, None, 0.0), ((502, 652, 262, 44), 2, None, 0.4)]),
    dict(chunk="08-save-account", a=0, b=7, speed=1.0, tail_hold=3.6, cam=[(0, 640, 405, 1110), (0.4, 760, 430, 1100)],
         caption="caption.03.saved", caption_at=3, events=[("ch03.saved", 3, "click")],
         marks=[((1032, 364, 192, 72), 3, None, 0.2), ((487, 652, 292, 44), 3, None, 0.5)]),
]

CH04 = [
    dict(chunk="13-select-row", a=0, b=4, speed=1.0, tail_hold=3.0, cam=FULL, caption="caption.04.select"),
    dict(chunk="14-review-input", a=0, b=11, speed=1.0, tail_hold=0.8, cam=FULL, caption="caption.04.fields"),
    dict(chunk="15-review-preview", a=0, b=5, speed=1.0, tail_hold=0.9, cam=FULL),
    dict(chunk="16-review-check", a=0, b=3, speed=1.0, head_hold=1.2, tail_hold=3.6, cam=[(0, 640, 380, 1000)],
         caption="caption.04.review", caption_at=3, events=[("ch04.checked", 3, "click")],
         note="frame 0 genuinely unchecked (held 1.2 s), frame 3 is the first genuinely checked frame; nothing is drawn on the box",
         marks=[((223.5, 447.25, 24, 24), 3, None, 0.0), ((228, 485, 188, 44), 3, None, 0.5)]),
    dict(chunk="17-confirm-row", a=0, b=4, speed=1.0, tail_hold=4.9, cam=FULL, caption="caption.04.confirmed_one", caption_at=3,
         events=[("ch04.confirmed", 3, "confirm")],
         marks=[((44, 620, 132, 22), 3, 3, 0.0), ((44, 702, 142, 20), 4, None, 0.0), ((286, 14, 140, 28), 3, None, 0.4)]),
]

CH05 = [
    dict(chunk="19-csv-top", a=0, b=10, speed=1.0, tail_hold=3.5, cam=FULL, caption="caption.05.scope"),
    dict(chunk="20-csv-preview", a=0, b=1, speed=1.0, tail_hold=3.6, cam=FULL, caption="caption.05.preview",
         marks=[((44, 450, 62, 22), 1, None, 0.3), ((46, 566, 1176, 48), 1, None, 0.9)]),
    dict(chunk="21-download", a=0, b=4, speed=1.0, head_hold=0.6, tail_hold=3.6, cam=FULL, caption="caption.05.saved", caption_at=3,
         events=[("ch05.saved", 3, "click")], note="full-height camera keeps the bottom-edge CSVを保存 control in frame",
         marks=[((333, 651, 599, 45), 3, None, 0.0), ((44, 440, 300, 16), 4, None, 0.2)]),
]

CHAPTERS = [("ch01", "chapter.01.number", "chapter.01.label", CH01), ("ch02", "chapter.02.number", "chapter.02.label", CH02),
            ("ch03", "chapter.03.number", "chapter.03.label", CH03), ("ch04", "chapter.04.number", "chapter.04.label", CH04),
            ("ch05", "chapter.05.number", "chapter.05.label", CH05)]

GRAPHICS_BEFORE = [("opener", 4.0), ("overview", 8.0), ("local", 4.0), ("title", 4.0)]
GRAPHICS_AFTER = [("formats", 7.0), ("runtime", 6.0), ("bench-time", 9.0), ("bench-core", 12.0), ("bench-more", 11.0),
                  ("bench-conditions", 9.0), ("notes", 9.0), ("end", 8.0)]
LOCAL_SHOT = dict(chunk="02-results", a=7, b=7, tail_hold=4.0, cam=[(0, 640, 360, 1280), (1.3, 640, 360, 1280), (2.6, 1080, 120, 680), (4.0, 1100, 110, 660)],
                  marks=[((1083, 16, 162, 24), 7, None, 2.4)])
