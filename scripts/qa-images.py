from PIL import Image, ImageDraw, ImageChops
from pathlib import Path
import json
out=Path("docs/verification/images")
out.mkdir(exist_ok=True)
cases=["short","primary-end","ten","eleven","eleven-end","longest","longest-end","warning","menu"]
stats=[]
for engine in ["msedge","firefox","webkit"]:
 for width in [320,359,360,375,768,1280]:
  for theme in ["emerald","night"]:
   # All input images are opened and decoded; paired views retain the whole viewport.
   tilew=min(width,640)
   tileh=round(900*tilew/width)
   sheet=Image.new("RGB",(tilew*6,(tileh+24)*3), "#dddddd")
   draw=ImageDraw.Draw(sheet)
   for row,case in enumerate(cases):
    pair=[]
    for version in [0,1]:
     file=Path(f".cache/qa/{engine}/{width}-{theme}-{case}-{version}.png")
     im=Image.open(file).convert("RGB")
     assert im.size==(width,900)
     assert im.getextrema()!=((0,0),(0,0),(0,0))
     pair.append(im)
     sheet.paste(im.resize((tilew,tileh)),((row%3*2+version)*tilew,(row//3)*(tileh+24)+24))
     draw.text(((row%3*2+version)*tilew+4,(row//3)*(tileh+24)+4),f"{engine} {width} {theme} {case} {'new' if version else '8e4ad79'}",fill="black")
    delta=ImageChops.difference(*pair)
    changed=sum(1 for pixel in delta.get_flattened_data() if max(pixel)>16)
    stats.append(dict(engine=engine,width=width,theme=theme,case=case,changedPixelsOver16=changed,totalPixels=width*900))
   # Edge contains every viewport/theme; other engines use focused sample sheets.
   if engine=="msedge" or width==375:
    sheet.save(out/f"{engine}-{width}-{theme}.png",optimize=True)
Path("docs/verification/pixels.json").write_text(json.dumps(stats,indent=2)+"\n")
