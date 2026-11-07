#!/usr/bin/env python3
"""Materializa os ícones PNG da extensão.

Os PNGs são versionados em base64 (limitação de push via API do GitHub, que só
aceita texto). Este script converte cada `icons/icon*.png` de base64 para PNG
binário e liga o bloco `icons` do manifest.json.

    python3 tools/restore_assets.py

É idempotente: se o arquivo já for um PNG de verdade, ele é preservado.
Se você baixou o pacote com os ícones já prontos, não precisa rodar nada.
"""
import base64
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG_SIG = b'\x89PNG\r\n\x1a\n'
SIZES = (16, 48, 128)


def restore_icon(size):
    path = os.path.join(ROOT, 'icons', f'icon{size}.png')
    if not os.path.exists(path):
        print(f'  - icons/icon{size}.png: ausente, pulando')
        return False
    raw = open(path, 'rb').read()
    if raw.startswith(PNG_SIG):
        print(f'  - icons/icon{size}.png: já é PNG, mantido')
        return False
    try:
        data = base64.b64decode(raw, validate=False)
    except Exception as exc:  # noqa: BLE001
        print(f'  ! icons/icon{size}.png: base64 inválido ({exc})')
        return False
    if not data.startswith(PNG_SIG):
        print(f'  ! icons/icon{size}.png: não parece um PNG')
        return False
    with open(path, 'wb') as fh:
        fh.write(data)
    print(f'  + icons/icon{size}.png: {len(data)} bytes restaurados')
    return True


def patch_manifest():
    path = os.path.join(ROOT, 'manifest.json')
    with open(path, encoding='utf-8') as fh:
        manifest = json.load(fh)
    icons = {str(s): f'icons/icon{s}.png' for s in SIZES}
    if manifest.get('icons') == icons:
        print('  = manifest.json: bloco "icons" já está ligado')
        return False
    manifest['icons'] = icons
    action = manifest.setdefault('action', {})
    action['default_icon'] = dict(icons)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print('  + manifest.json: bloco "icons" ligado')
    return True


def main():
    print('Restaurando os ícones da extensão…')
    restore_icon(16)
    restore_icon(48)
    restore_icon(128)
    patch_manifest()
    print('Pronto. Recarregue a extensão em chrome://extensions.')


if __name__ == '__main__':
    sys.exit(main())
