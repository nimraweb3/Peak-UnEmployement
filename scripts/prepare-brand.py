"""Install fonttools and brotli first; this converts the bundled licensed WOFF2 locally."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(".cache/brand-tools")))
from fontTools.ttLib import TTFont
Path(".cache").mkdir(exist_ok=True)
font = TTFont("public/fonts/space-grotesk-latin.woff2")
font.flavor = None
font.save(".cache/space-grotesk.ttf")
