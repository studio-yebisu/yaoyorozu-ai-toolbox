"""上面が開いた小物ケースの寸法提案（未実行のPythonコード）。

text-to-cad の cad スキル（earthtojake/text-to-cad、コミット
2f793659fb7bab537e2f00836e06448fc4087cb2 の skills/cad/SKILL.md）が示す
「装飾つきの引数なし関数が build123d の形を返す」モデルの書き方に合わせて書いた提案です。

この作例では cadgen・build123d・OCP をインストールしておらず、このファイルを
一度も実行していません。STEP/parts-case.step はまだ存在しません。
寸法は dims.mjs と parameters.json の "small" と同じ値です。

上流の手順どおりなら、cadgen が使える環境で次のように実行すると
（decorator の out= はこのスクリプトからの相対パス）STEP が書き出されます。
    python model-proposal.py
上流は「スクリプト名と出力名の語幹をそろえる」ことを勧めているので、
実際のプロジェクトに入れるときは parts-case.py に名前を変えてください。
"""

from cadgen import build123d as bd
from cadgen import step

# 外形（mm）
OUTER_WIDTH = 100.0
OUTER_DEPTH = 70.0
OUTER_HEIGHT = 24.0

# 壁と底の厚さ（mm）。同じ厚さにする。
WALL = 2.4
FLOOR = 2.4

# 内寸（mm）：95.2 × 65.2 × 21.6
INNER_WIDTH = OUTER_WIDTH - 2 * WALL
INNER_DEPTH = OUTER_DEPTH - 2 * WALL
INNER_HEIGHT = OUTER_HEIGHT - FLOOR

# 幅広案（parameters.json の "wide"）は OUTER_WIDTH = 130.0、内寸の幅は 125.2。

# くぼみを上へ少し伸ばして、上面と同じ高さの面が残らないようにする（形は変わらない）
CUT_OVERSHOOT = 1.0


def parts_case_shape(
    width: float = OUTER_WIDTH,
    depth: float = OUTER_DEPTH,
    height: float = OUTER_HEIGHT,
    wall: float = WALL,
    floor: float = FLOOR,
):
    """外形の箱からくぼみの箱を引いた、上面が開いたケース。底面が z = 0。"""
    bottom_centered = (bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
    outer = bd.Box(width, depth, height, align=bottom_centered)
    cavity = bd.Box(
        width - 2 * wall,
        depth - 2 * wall,
        height - floor + CUT_OVERSHOOT,
        align=bottom_centered,
    )
    # くぼみの底を床の厚さだけ持ち上げる
    cavity = bd.Pos(0, 0, floor) * cavity
    case = outer - cavity
    case.label = "parts_case"
    return case


@step(out="STEP/parts-case.step")
def parts_case():
    return parts_case_shape()


if __name__ == "__main__":
    parts_case()
