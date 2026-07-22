#!/usr/bin/env python3
"""
Template-aware PPTX builder for Presentation OS.

This module loads an existing .pptx template and creates new slides using
the template's layouts, preserving all background images, logos, and decorations.

Usage:
    python3 template_builder.py <template_path> <output_path> <slides_json>
"""
import json
import sys
import os

# Add local site-packages to path for pptx library if not in system Python
local_site = os.environ.get('PPTX_SITE_PACKAGES', '')
if local_site and local_site not in sys.path:
    sys.path.insert(0, local_site)

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE


def add_card(slide, x, y, w, h, text, fill_color, text_color=RGBColor.from_string('FFFFFF'),
             font_size=11, bold=False, line_color=None):
    """Add a rounded rectangle card to a slide."""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if line_color:
        shape.line.color.rgb = line_color
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(8)
    tf.margin_right = Pt(8)
    tf.margin_top = Pt(6)
    tf.margin_bottom = Pt(6)
    
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = text_color
    p.alignment = PP_ALIGN.CENTER
    
    shape.vertical_anchor = MSO_ANCHOR.MIDDLE
    return shape


def build_from_template(template_path, output_path, slides_data):
    """
    Build PPTX from template.
    
    Args:
        template_path: Path to .pptx template
        output_path: Path to save output .pptx
        slides_data: List of dicts with slide configuration
    """
    prs = Presentation(template_path)
    
    # Remove all slides
    rId_list = []
    for rel in prs.part.rels.values():
        if "slide" in rel.target_ref:
            rId_list.append(rel.rId)
    
    for rId in rId_list:
        prs.part.drop_rel(rId)
    
    # Remove slideIdLst entries
    sldIdLst = prs.slide_layouts[0]._element.getparent().find('.//{http://schemas.openxmlformats.org/presentationml/2006/main}sldIdLst')
    if sldIdLst is not None:
        prs.slide_layouts[0]._element.getparent().remove(sldIdLst)
    
    # Map roles to template layouts
    layout_map = {
        'cover': 0,
        'agenda': 1,
        'section-divider': 2,
        'content': 1,
        'closing': 10,
    }
    
    added_slides = []
    for slide_data in slides_data:
        role = slide_data.get('role', 'content')
        layout_idx = layout_map.get(role, 1)
        
        try:
            layout = prs.slide_layouts[layout_idx]
            slide = prs.slides.add_slide(layout)
            added_slides.append((slide, slide_data))
        except Exception as e:
            print(f"Warning: Failed to add {role} slide: {e}")
            continue
    
    # Populate slides
    for slide, data in added_slides:
        title = data.get('title', '')
        body = data.get('body', [])
        cards = data.get('cards', [])
        role = data.get('role', 'content')
        
        if slide.shapes.title:
            slide.shapes.title.text = title
        
        if role == 'agenda' and cards:
            _add_agenda_cards(slide, cards)
        elif role == 'section-divider' and cards:
            _add_section_cards(slide, cards)
        elif role == 'cover':
            _format_cover(slide, title, body)
        elif role == 'closing':
            _format_closing(slide, title)
        else:
            _add_content(slide, title, body)
    
    prs.save(output_path)
    return len(added_slides)


def _add_agenda_cards(slide, cards):
    """Add agenda cards to slide."""
    C_NAVY = RGBColor.from_string('0A2454')
    C_CYAN = RGBColor.from_string('39C2D4')
    C_LIGHT_BG = RGBColor.from_string('E8F4F8')
    
    card_w = Inches(2.3)
    card_h = Inches(1.4)
    gap_x = Inches(0.3)
    gap_y = Inches(0.3)
    start_x = Inches(0.4)
    start_y = Inches(1.5)
    
    for i, (num, title) in enumerate(cards):
        col = i % 4
        row = i // 4
        x = start_x + col * (card_w + gap_x)
        y = start_y + row * (card_h + gap_y)
        add_card(slide, x, y, card_w, card_h, f'{num}\n{title}', C_LIGHT_BG, C_NAVY, 12, True, C_CYAN)


def _add_section_cards(slide, cards):
    """Add section divider cards."""
    C_MED_BLUE = RGBColor.from_string('1E3D6E')
    C_WHITE = RGBColor.from_string('FFFFFF')
    
    card_w = Inches(3.0)
    card_h = Inches(1.4)
    gap = Inches(0.3)
    start_x = Inches(0.5)
    start_y = Inches(3.0)
    
    for text in cards:
        add_card(slide, start_x, start_y, card_w, card_h, text, C_MED_BLUE, C_WHITE, 11)
        start_x += card_w + gap


def _format_cover(slide, title, body=None):
    """Format cover slide."""
    C_NAVY = RGBColor.from_string('0A2454')
    
    for shape in slide.shapes:
        try:
            if shape.placeholder_format.idx == 1:
                tf = shape.text_frame
                tf.clear()
                p = tf.paragraphs[0]
                p.text = '\n'.join(body or ['汇报人：病理科\n时间：2024年'])
                p.font.size = Pt(16)
                p.font.color.rgb = C_NAVY
        except ValueError:
            pass


def _format_closing(slide, title):
    """Format closing slide."""
    if slide.shapes.title:
        slide.shapes.title.text = title


def _add_content(slide, title, body):
    """Add content slide."""
    if slide.shapes.title:
        slide.shapes.title.text = title
    
    for shape in slide.shapes:
        try:
            if shape.placeholder_format.idx == 1:
                tf = shape.text_frame
                tf.clear()
                for i, item in enumerate(body):
                    if i == 0:
                        tf.paragraphs[0].text = item
                    else:
                        p = tf.add_paragraph()
                        p.text = item
                    p.font.size = Pt(14)
                    p.font.color.rgb = RGBColor.from_string('1A1A1A')
                break
        except ValueError:
            pass


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python3 template_builder.py <template_path> <output_path> <slides_json>")
        sys.exit(1)
    
    template_path = sys.argv[1]
    output_path = sys.argv[2]
    slides_json = sys.argv[3]
    
    slides_data = json.loads(slides_json)
    count = build_from_template(template_path, output_path, slides_data)
    print(f"✅ Built {count} slides")
