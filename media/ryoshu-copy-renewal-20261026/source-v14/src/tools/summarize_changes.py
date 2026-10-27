"""Print significant frame changes per chunk from changes.json (read-only)."""
import json
import sys

d = json.load(open(sys.argv[1]))
for c, rows in d.items():
    t0 = rows[0]["t"]
    big = [(r["i"], round(r["t"] - t0, 2), r["diff"], r["box"]) for r in rows if r["diff"] and r["diff"] > 0.05]
    print(c, len(rows), "changes:", len(big))
    for x in big:
        tall = x[3] and (x[3][3] - x[3][1] > 30)
        if c.startswith(("A2", "A3", "A4")):
            if tall or x[2] > 0.5:
                print("  ", x)
        else:
            print("  ", x)
