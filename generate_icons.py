import os
from PIL import Image, ImageDraw


def create_autofiller_icon(size, style="normal"):
    scale = 6
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if style == "normal":
        ring_c = (150, 165, 185, 255)
        card_fill = (242, 245, 249, 255)
        card_border = (135, 150, 170, 255)
        accent_c = (0, 122, 255, 255)
        line_c = (120, 134, 154, 255)
        badge_c = (56, 189, 248, 255)
    elif style == "rollover":
        ring_c = (0, 145, 255, 255)
        card_fill = (255, 255, 255, 255)
        card_border = (0, 122, 255, 255)
        accent_c = (0, 122, 255, 255)
        line_c = (70, 110, 165, 255)
        badge_c = (14, 165, 233, 255)
    elif style == "dark":
        ring_c = (100, 116, 139, 255)
        card_fill = (38, 43, 52, 255)
        card_border = (82, 94, 112, 255)
        accent_c = (10, 132, 255, 255)
        line_c = (148, 163, 184, 255)
        badge_c = (56, 189, 248, 255)
    elif style == "dark-hover":
        ring_c = (56, 189, 248, 255)
        card_fill = (46, 53, 66, 255)
        card_border = (56, 189, 248, 255)
        accent_c = (56, 189, 248, 255)
        line_c = (210, 224, 245, 255)
        badge_c = (125, 211, 252, 255)
    elif style == "brand":
        # Full color App Icon for Header / README
        ring_c = (45, 212, 191, 255)
        card_fill = (28, 34, 46, 255)
        card_border = (56, 189, 248, 255)
        accent_c = (0, 122, 255, 255)
        line_c = (203, 213, 225, 255)
        badge_c = (249, 115, 22, 255)
    else:  # disabled
        ring_c = (110, 110, 110, 150)
        card_fill = (90, 90, 90, 120)
        card_border = (110, 110, 110, 150)
        accent_c = (130, 130, 130, 160)
        line_c = (115, 115, 115, 150)
        badge_c = (120, 120, 120, 150)

    # Background rounded badge only for large brand icon
    if style == "brand":
        bg_pad = int(canvas_size * 0.04)
        draw.rounded_rectangle(
            [bg_pad, bg_pad, canvas_size - bg_pad, canvas_size - bg_pad],
            radius=int(canvas_size * 0.22),
            fill=(22, 27, 36, 255),
            outline=(56, 189, 248, 90),
            width=max(2, int(scale * 0.9)),
        )

    # 1. Keyring loop in top-left
    ring_x0 = int(canvas_size * 0.11)
    ring_y0 = int(canvas_size * 0.11)
    ring_x1 = int(canvas_size * 0.56)
    ring_y1 = int(canvas_size * 0.56)
    ring_w = max(2, int(canvas_size * 0.075))
    draw.ellipse([ring_x0, ring_y0, ring_x1, ring_y1], outline=ring_c, width=ring_w)

    # 2. Smart Card / Keyring Tag body in bottom-right
    c_x0 = int(canvas_size * 0.30)
    c_y0 = int(canvas_size * 0.28)
    c_x1 = int(canvas_size * 0.89)
    c_y1 = int(canvas_size * 0.89)
    c_rad = max(2, int(canvas_size * 0.12))
    c_border_w = max(2, int(canvas_size * 0.045))
    draw.rounded_rectangle(
        [c_x0, c_y0, c_x1, c_y1],
        radius=c_rad,
        fill=card_fill,
        outline=card_border,
        width=c_border_w,
    )

    # 3. Tag eyelet punch hole
    hole_r = max(2, int(canvas_size * 0.055))
    hole_cx = int(c_x0 + (c_x1 - c_x0) * 0.23)
    hole_cy = int(c_y0 + (c_y1 - c_y0) * 0.23)
    draw.ellipse(
        [hole_cx - hole_r, hole_cy - hole_r, hole_cx + hole_r, hole_cy + hole_r],
        fill=(0, 0, 0, 0) if style != "brand" else (22, 27, 36, 255),
        outline=ring_c,
        width=max(1, int(canvas_size * 0.025)),
    )

    # 4. Accent bar (Name field) + Detail lines
    lx0 = int(c_x0 + (c_x1 - c_x0) * 0.18)
    lx1_long = int(c_x1 - (c_x1 - c_x0) * 0.16)
    lx1_mid = int(c_x1 - (c_x1 - c_x0) * 0.28)
    lx1_short = int(c_x1 - (c_x1 - c_x0) * 0.42)

    y_name = int(c_y0 + (c_y1 - c_y0) * 0.47)
    y_l2 = int(c_y0 + (c_y1 - c_y0) * 0.65)
    y_l3 = int(c_y0 + (c_y1 - c_y0) * 0.80)

    h_name = max(2, int(canvas_size * 0.065))
    h_line = max(2, int(canvas_size * 0.045))

    draw.rounded_rectangle([lx0, y_name - h_name // 2, lx1_long, y_name + h_name // 2], radius=h_name // 2, fill=accent_c)
    draw.rounded_rectangle([lx0, y_l2 - h_line // 2, lx1_mid, y_l2 + h_line // 2], radius=h_line // 2, fill=line_c)
    draw.rounded_rectangle([lx0, y_l3 - h_line // 2, lx1_short, y_l3 + h_line // 2], radius=h_line // 2, fill=line_c)

    # 5. Auto-fill spark dot at top-right of card
    sp_r = max(2, int(canvas_size * 0.065))
    sp_cx = int(c_x1 - (c_x1 - c_x0) * 0.20)
    sp_cy = hole_cy
    draw.ellipse([sp_cx - sp_r, sp_cy - sp_r, sp_cx + sp_r, sp_cy + sp_r], fill=badge_c)

    return img.resize((size, size), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(base_dir, "icons")
    os.makedirs(icons_dir, exist_ok=True)

    # Adobe CEP Toolbar Icons
    create_autofiller_icon(23, "normal").save(os.path.join(icons_dir, "icon-normal.png"))
    create_autofiller_icon(46, "normal").save(os.path.join(icons_dir, "icon-normal@2x.png"))
    create_autofiller_icon(23, "rollover").save(os.path.join(icons_dir, "icon-rollover.png"))
    create_autofiller_icon(46, "rollover").save(os.path.join(icons_dir, "icon-rollover@2x.png"))
    create_autofiller_icon(23, "disabled").save(os.path.join(icons_dir, "icon-disabled.png"))
    create_autofiller_icon(23, "dark").save(os.path.join(icons_dir, "icon-dark.png"))
    create_autofiller_icon(46, "dark").save(os.path.join(icons_dir, "icon-dark@2x.png"))
    create_autofiller_icon(23, "dark-hover").save(os.path.join(icons_dir, "icon-dark-hover.png"))

    # Brand UI & README Icons
    create_autofiller_icon(48, "brand").save(os.path.join(icons_dir, "icon-48.png"))
    create_autofiller_icon(128, "brand").save(os.path.join(icons_dir, "icon-128.png"))
    create_autofiller_icon(128, "brand").save(os.path.join(icons_dir, "icon.png"))
    create_autofiller_icon(256, "brand").save(os.path.join(icons_dir, "icon-256.png"))
    print("Generated Auto Filler Pro icons successfully.")
