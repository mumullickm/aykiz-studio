#!/usr/bin/env python3
"""Hirra Open Graph card generator.

Renders every share card the site needs, 1200x630, in the Hirra ink theme:
  og-hirra.png            product page (written to ../og-hirra.png)
  og/guide.png            English guide hub
  og/guide-ar.png         Arabic guide hub
  og/<slug>.png           one per English article
  og/ar-<slug>.png        one per Arabic article

Run:  python3 build_og.py
Article data is imported straight from ../../guide/build.py, so adding an
article there and re-running this is all it takes to get its card.

LOGO RULE: the only permitted Hirra mark is the shipped App Store icon,
assets/icon-1024.png (verified byte-identical to the live store artwork).
Never the hand-drawn wordmark (hirra-logo.svg) and never a redrawn cat
(hirra-mark.svg, hirra-cat.svg).

House rules honoured: no em-dashes, Western digits, non-diagnostic framing.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

import arabic_reshaper
from bidi.algorithm import get_display

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.dirname(HERE)
GUIDE = os.path.join(os.path.dirname(ASSETS), "guide")
FONTS = os.path.join(HERE, "fonts")
ICON = os.path.join(ASSETS, "icon-1024.png")

W, H = 1200, 630

# brand tokens, lifted from the live guide + product page CSS
INK = (6, 24, 28)
INK2 = (16, 42, 48)
CREAM = (238, 244, 245)
MIST = (169, 194, 200)
FAINT = (94, 122, 128)
LINE = (28, 58, 66)

VERDICT = {
    "danger":  ((255, 128, 149), (48, 20, 28)),
    "caution": ((245, 182, 66), (44, 33, 14)),
    "safe":    ((52, 211, 153), (12, 40, 34)),
    "info":    ((95, 208, 196), (10, 40, 40)),
}


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def w_of(draw, text, f):
    return draw.textbbox((0, 0), text, font=f)[2]


def wrap(draw, text, f, maxw):
    """Greedy word wrap by measured pixel width."""
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if w_of(draw, trial, f) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def fit(draw, text, fname, sizes, maxw, maxlines):
    """Pick the largest size where the text wraps into maxlines or fewer."""
    for size in sizes:
        f = font(fname, size)
        lines = wrap(draw, text, f, maxw)
        if len(lines) <= maxlines:
            return f, lines
    f = font(fname, sizes[-1])
    return f, wrap(draw, text, f, maxw)[:maxlines]


def ar(text):
    """Shape + reorder Arabic so PIL draws it correctly."""
    return get_display(arabic_reshaper.reshape(text))


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def icon_tile(px, radius_ratio=0.2237):
    """The shipped App Store icon in an iOS-style squircle-ish rounded tile."""
    ic = Image.open(ICON).convert("RGB").resize((px, px), Image.LANCZOS)
    out = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    out.paste(ic, (0, 0))
    out.putalpha(rounded_mask((px, px), int(px * radius_ratio)))
    return out


def base_card():
    """Ink background with a soft wash toward the top right, plus a hairline frame."""
    img = Image.new("RGB", (W, H), INK)
    # radial-ish wash, drawn as concentric ellipses so it stays cheap and smooth
    wash = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(wash)
    cx, cy, steps = int(W * 0.80), int(H * 0.16), 60
    rmax = int(W * 0.78)
    for i in range(steps, 0, -1):
        t = i / steps
        r = int(rmax * t)
        col = tuple(int(INK[c] + (INK2[c] - INK[c]) * (1 - t) ** 1.7) for c in range(3))
        d.ellipse([cx - r, cy - int(r * 0.85), cx + r, cy + int(r * 0.85)], fill=col)
    img = Image.blend(img, wash, 0.95)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([16, 16, W - 17, H - 17], 24, outline=LINE, width=2)
    return img


def draw_tracked(d, x, y, text, f, fill, track=3):
    """Letterspaced type. Returns the advance width."""
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += w_of(d, ch, f) + track
    return x


def tracked_w(d, text, f, track=3):
    return sum(w_of(d, ch, f) + track for ch in text) - track


def brand_row(img, d, y=54, lang="en"):
    """Icon tile + HIRRA lockup + section label. Mirrors for RTL."""
    px, rtl = 62, lang == "ar"
    tile = icon_tile(px)
    f = font("Nunito-ExtraBold.ttf", 27)
    sub = "دليل العناية بالقطط" if rtl else "Cat care guide"
    fs = font("IBMPlexSansArabic-Regular.ttf" if rtl else "NunitoSans-SemiBold.ttf", 20)
    stext = ar(sub) if rtl else sub

    if rtl:
        # lockup reads right to left: icon at the far right, wordmark to its left
        img.paste(tile, (W - 72 - px, y), tile)
        wm = tracked_w(d, "HIRRA", f)
        wx = W - 72 - px - 20 - wm
        draw_tracked(d, wx, y + 17, "HIRRA", f, CREAM)
        d.text((wx - 16 - w_of(d, stext, fs), y + 22), stext, font=fs, fill=FAINT)
    else:
        img.paste(tile, (72, y), tile)
        # letterspaced wordmark set in type, never the hand-drawn wordmark file
        x = draw_tracked(d, 72 + px + 20, y + 17, "HIRRA", f, CREAM)
        d.text((x + 16, y + 22), stext, font=fs, fill=FAINT)
    return y + px


def pill(d, x, y, text, fg, bg, f, padx=22, pady=12):
    tw = w_of(d, text, f)
    bbox = d.textbbox((0, 0), text, font=f)
    th = bbox[3] - bbox[1]
    h = th + pady * 2
    d.rounded_rectangle([x, y, x + tw + padx * 2, y + h], h // 2, fill=bg, outline=fg, width=2)
    d.text((x + padx, y + pady - bbox[1]), text, font=f, fill=fg)
    return h


def footer(d, lang="en"):
    """Domain on the reading-start side, store line on the reading-end side."""
    rtl = lang == "ar"
    f = font("NunitoSans-SemiBold.ttf", 21)
    dom = "aykizintelligence.com/hirra"
    label = "مجانًا على App Store" if rtl else "Free on the App Store"
    fr = font("IBMPlexSansArabic-Regular.ttf" if rtl else "NunitoSans-SemiBold.ttf", 21)
    txt = ar(label) if rtl else label
    if rtl:
        d.text((W - 72 - w_of(d, dom, f), H - 92), dom, font=f, fill=FAINT)
        d.text((72, H - 92), txt, font=fr, fill=MIST)
    else:
        d.text((72, H - 92), dom, font=f, fill=FAINT)
        d.text((W - 72 - w_of(d, txt, fr), H - 92), txt, font=fr, fill=MIST)


def article_card(h1, cat, verdict, verdict_label, out, lang="en"):
    img = base_card()
    d = ImageDraw.Draw(img)
    brand_row(img, d, lang=lang)

    fg, bg = VERDICT[verdict]
    rtl = lang == "ar"
    head_font = "IBMPlexSansArabic-Bold.ttf" if rtl else "Nunito-ExtraBold.ttf"
    body_font = "IBMPlexSansArabic-Regular.ttf" if rtl else "NunitoSans-SemiBold.ttf"

    # Measure the whole stack first, then centre it in the band between the
    # brand row and the footer so one-line and three-line titles both sit right.
    fk = font(body_font, 22)
    kick = ar(cat) if rtl else cat.upper()
    text = ar(h1) if rtl else h1
    f, lines = fit(d, text, head_font, [64, 58, 52, 46, 41], W - 144, 3)
    lh = int(f.size * 1.22)
    fp = font("IBMPlexSansArabic-Bold.ttf" if rtl else "Nunito-Bold.ttf", 25)
    ptxt = ar(verdict_label) if rtl else verdict_label
    pill_h = (d.textbbox((0, 0), ptxt, font=fp)[3]
              - d.textbbox((0, 0), ptxt, font=fp)[1]) + 24

    stack = 46 + lh * len(lines) + 18 + pill_h
    top, bottom = 150, H - 130
    y = top + max(0, (bottom - top - stack) // 2)

    # category kicker
    if rtl:
        d.text((W - 72 - w_of(d, kick, fk), y), kick, font=fk, fill=fg)
    else:
        draw_tracked(d, 72, y, kick, fk, fg, track=2)
    y += 46

    # headline, the actual answer people are sharing
    for ln in lines:
        d.text(((W - 72 - w_of(d, ln, f)) if rtl else 72, y), ln, font=f, fill=CREAM)
        y += lh
    y += 18

    # verdict pill, the at-a-glance answer
    if rtl:
        pill(d, W - 72 - w_of(d, ptxt, fp) - 44, y, ptxt, fg, bg, fp)
    else:
        pill(d, 72, y, ptxt, fg, bg, fp)

    footer(d, lang=lang)
    img.save(out, "PNG", optimize=True)
    return out


def hub_card(out, lang="en"):
    img = base_card()
    d = ImageDraw.Draw(img)
    brand_row(img, d, lang=lang)
    rtl = lang == "ar"
    head_font = "IBMPlexSansArabic-Bold.ttf" if rtl else "Nunito-ExtraBold.ttf"
    body_font = "IBMPlexSansArabic-Regular.ttf" if rtl else "NunitoSans-SemiBold.ttf"

    h1 = ("صحة القطط وسلامة الطعام بلغة واضحة" if rtl
          else "Cat health and food safety, in plain language")
    sub = ("إجابات هادئة عن الأسئلة التي يبحث عنها أصحاب القطط فعلًا."
           if rtl else
           "Calm, clear answers to the questions cat owners actually search.")

    y = 214
    text = ar(h1) if rtl else h1
    f, lines = fit(d, text, head_font, [62, 56, 50, 45], W - 144, 3)
    lh = int(f.size * 1.22)
    for ln in lines:
        d.text(((W - 72 - w_of(d, ln, f)) if rtl else 72, y), ln, font=f, fill=CREAM)
        y += lh
    y += 16
    fs = font(body_font, 26)
    stext = ar(sub) if rtl else sub
    for ln in wrap(d, stext, fs, W - 144)[:2]:
        d.text(((W - 72 - w_of(d, ln, fs)) if rtl else 72, y), ln, font=fs, fill=MIST)
        y += int(fs.size * 1.35)

    footer(d, lang=lang)
    img.save(out, "PNG", optimize=True)
    return out


def product_card(out):
    """The main site card. Replaces the stale 'Coming soon for iPhone' art."""
    img = base_card()
    d = ImageDraw.Draw(img)

    # hero icon, right side, the shipped App Store artwork
    px = 300
    tile = icon_tile(px)
    img.paste(tile, (W - 72 - px, (H - px) // 2 - 10), tile)

    x = 72
    f = font("Nunito-ExtraBold.ttf", 27)
    xx = x
    for ch in "HIRRA":
        d.text((xx, 92), ch, font=f, fill=CREAM)
        xx += w_of(d, ch, f) + 3

    maxw = W - 72 - px - 72 - 56
    y = 168
    fh, lines = fit(d, "Catch the quiet signs in your cat.",
                    "Nunito-ExtraBold.ttf", [60, 54, 49, 44], maxw, 3)
    for ln in lines:
        d.text((x, y), ln, font=fh, fill=CREAM)
        y += int(fh.size * 1.2)
    y += 14

    fs = font("NunitoSans-SemiBold.ttf", 25)
    for ln in wrap(d, "A calm, private cat health companion.", fs, maxw)[:2]:
        d.text((x, y), ln, font=fs, fill=MIST)
        y += int(fs.size * 1.35)
    y += 26

    fg, bg = VERDICT["safe"]
    pill(d, x, y, "Free on the App Store", fg, bg, font("Nunito-Bold.ttf", 25))

    d.text((x, H - 92), "aykizintelligence.com/hirra",
           font=font("NunitoSans-SemiBold.ttf", 21), fill=FAINT)
    img.save(out, "PNG", optimize=True)
    return out


def main():
    sys.path.insert(0, GUIDE)
    import build as guide  # article data lives there, single source of truth

    outdir = HERE
    made = []

    made.append(product_card(os.path.join(ASSETS, "og-hirra.png")))
    made.append(hub_card(os.path.join(outdir, "guide.png"), "en"))
    made.append(hub_card(os.path.join(outdir, "guide-ar.png"), "ar"))

    for a in guide.ARTICLES:
        made.append(article_card(
            a["h1"], a["cat"], a["verdict"], a["verdict_label"],
            os.path.join(outdir, a["slug"] + ".png"), "en"))

    for slug, v in guide.AR_ARTICLES.items():
        en = guide.by_slug(slug)
        # Arabic entries carry no category of their own, they reuse the
        # English article's category translated through AR_CATS.
        made.append(article_card(
            v["h1"], guide.AR_CATS[en["cat"]], en["verdict"], v["verdict_label"],
            os.path.join(outdir, "ar-" + slug + ".png"), "ar"))

    total = sum(os.path.getsize(p) for p in made)
    print("Rendered %d Open Graph cards, %.0f KB total" % (len(made), total / 1024))
    for p in made:
        print("  %-58s %5.0f KB" % (os.path.relpath(p, ASSETS), os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
