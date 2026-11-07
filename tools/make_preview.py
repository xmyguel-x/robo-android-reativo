#!/usr/bin/env python3
"""Gera docs/preview.svg (imagem de capa do repositório).

Por que SVG e não PNG: o SVG é texto puro, então versiona e renderiza no GitHub
sem passar por upload binário. As formas do robô são as mesmas do content.js.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HEAD = 'M40 75 A63 57 0 0 1 166 75 Z'
BODY = 'M40 78 H166 V176 A14 14 0 0 1 152 190 H54 A14 14 0 0 1 40 176 Z'
LEG_L = 'M65 180 h28 v47 a11 11 0 0 1 -11 11 h-6 a11 11 0 0 1 -11 -11 Z'
LEG_R = 'M114 180 h28 v47 a11 11 0 0 1 -11 11 h-6 a11 11 0 0 1 -11 -11 Z'
ARM_L = 'M6 95.5 a13.5 13.5 0 0 1 27 0 v55 a13.5 13.5 0 0 1 -27 0 Z'
ARM_R = 'M174 95.5 a13.5 13.5 0 0 1 27 0 v55 a13.5 13.5 0 0 1 -27 0 Z'

GREEN = '#A4C639'
DARK = '#14171e'
MUTED = '#7c7a72'

EYES = {
    'happy': '<path d="M67.5 51.5 q6 -7 12 0" /><path d="M126.5 51.5 q6 -7 12 0" />',
    'sad': '<path d="M67.5 45 q6 7 12 0" /><path d="M126.5 45 q6 7 12 0" />',
    'angry': '<path d="M67 43 l13 9" /><path d="M140 43 l-13 9" />',
    'think': '<circle cx="73.5" cy="43" r="5.4" /><circle cx="132.5" cy="48" r="5.4" />',
    'love': '<path d="M73.5 38.5 c-5 -4.5 -11 1.5 -6 6 l6 6 l6 -6 c5 -4.5 -1 -10.5 -6 -6 z" />'
            '<path d="M132.5 38.5 c-5 -4.5 -11 1.5 -6 6 l6 6 l6 -6 c5 -4.5 -1 -10.5 -6 -6 z" />',
}
MOUTH = {
    'happy': '<path d="M90 63 q13 9 26 0" />',
    'sad': '<path d="M90 67 q13 -9 26 0" />',
    'angry': '<path d="M92 66 q11 -5 22 0" />',
    'think': '<path d="M95 66 h16" />',
    'love': '<path d="M90 63 q13 9 26 0" />',
}


def robot(x, y, scale, face='happy', stroke_only=False):
    eyes = EYES.get(face, EYES['happy'])
    mouth = MOUTH.get(face, '')
    return f'''
  <g transform="translate({x},{y}) scale({scale})">
    <g fill="{GREEN}">
      <path d="{LEG_L}" /><path d="{LEG_R}" />
      <path d="{ARM_L}" /><path d="{ARM_R}" />
      <path d="{BODY}" />
      <path d="M61 2 L73 26" fill="none" stroke="{GREEN}" stroke-width="5" stroke-linecap="round" />
      <path d="M146 2 L134 26" fill="none" stroke="{GREEN}" stroke-width="5" stroke-linecap="round" />
      <path d="{HEAD}" />
    </g>
    <g fill="none" stroke="#fff" stroke-width="4.4" stroke-linecap="round">{eyes}</g>
    <g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round">{mouth}</g>
  </g>'''


def main():
    faces = [
        ('happy', 'alegre', 624),
        ('love', 'apaixonado', 752),
        ('angry', 'irritado', 880),
        ('think', 'pensando', 1008),
    ]
    mini = []
    for face, label, x in faces:
        mini.append(robot(x, 330, 0.62, face))
        mini.append(f'<text x="{x + 62}" y="512" text-anchor="middle" font-size="17" '
                    f'font-weight="600" fill="{MUTED}">{label}</text>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 540" width="1200" height="540"
     font-family="Outfit, 'Segoe UI', system-ui, sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8f7f2" />
      <stop offset="1" stop-color="#eaf1dd" />
    </linearGradient>
  </defs>
  <rect width="1200" height="540" fill="url(#bg)" />
  <ellipse cx="210" cy="452" rx="120" ry="18" fill="#14171e" opacity="0.08" />
  {robot(70, 120, 1.35, 'happy')}
  <g>
    <rect x="380" y="92" width="700" height="188" rx="26" fill="#fff" stroke="#e9e3d6" />
    <path d="M400 278 l-42 38 l62 -30 z" fill="#fff" stroke="#e9e3d6" />
    <rect x="416" y="122" width="132" height="28" rx="14" fill="{GREEN}" opacity="0.18" />
    <circle cx="432" cy="136" r="5" fill="{GREEN}" />
    <text x="446" y="142" font-size="14" font-weight="700" fill="#4e6b12" letter-spacing="1">EMPOLGADO</text>
    <text x="416" y="192" font-size="25" font-weight="500" fill="{DARK}">Uau, que coisa incr&#237;vel!! O rob&#244; j&#225; est&#225; andando e falando.</text>
    <text x="416" y="230" font-size="19" fill="{MUTED}">Cada rea&#231;&#227;o da mensagem vira uma anima&#231;&#227;o diferente.</text>
  </g>
  <g>
    <rect x="596" y="300" width="580" height="222" rx="22" fill="#fff" opacity="0.75" stroke="#e9e3d6" />
    {''.join(mini)}
  </g>
</svg>
'''
    out = os.path.join(ROOT, 'docs', 'preview.svg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(svg)
    print('gerado:', out)


if __name__ == '__main__':
    main()
