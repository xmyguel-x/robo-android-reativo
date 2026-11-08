"""Teste automatizado da extensão 'Robô Android Reativo'.

Carrega a extensão de verdade no Chromium (headless=new suporta extensões),
abre o chat simulado e confere:
  - injeção do mascote na página
  - leitura da mensagem do assistente
  - detecção da reação + animação correspondente
  - texto reproduzido no balão
Salva screenshots em test/shots/.
"""
import os
import sys
import time

from playwright.sync_api import sync_playwright

EXT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHOTS = os.path.join(EXT, 'test', 'shots')
PORT = int(os.environ.get("AR_TEST_PORT", "8765"))

os.makedirs(SHOTS, exist_ok=True)

failures = []


def check(cond, label):
    status = "OK  " if cond else "FAIL"
    print(f"[{status}] {label}")
    if not cond:
        failures.append(label)
    return cond


CHROME_CANDIDATES = [
    "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome",
    "/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
]


def find_chrome():
    for candidate in CHROME_CANDIDATES:
        if os.path.exists(candidate):
            return candidate
    return None


def main():
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir="/tmp/ar-profile",
            executable_path=find_chrome(),
            headless=True,
            args=[
                f"--disable-extensions-except={EXT}",
                f"--load-extension={EXT}",
                "--no-sandbox",
            ],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.set_viewport_size({"width": 1100, "height": 760})
        page.goto(f"http://127.0.0.1:{PORT}/test/mock-chat.html")
        page.wait_for_timeout(2500)

        # 1. o mascote foi injetado?
        check(page.locator("#ar-root").count() == 1, "mascote injetado na página")
        check(page.locator("#ar-root .ar-svg").count() == 1, "SVG do robô presente")
        check(page.locator("#ar-root .ar-bubble").count() == 1, "balão de fala presente")

        # 2. auto-detecção em diferentes DOMs de chat
        variants = [
            ("role", "marcador"),      # data-role="assistant"
            ("attribute", "marcador"), # data-message-author-role="assistant"
            ("class", "marcador"),     # class="message assistant"
            ("aligned", "estrutura"),  # sem marcadores, usuário à direita
            ("plain", "estrutura"),    # sem marcadores, sem alinhamento
        ]
        for variant, expect_mode in variants:
            page.goto(f"http://127.0.0.1:{PORT}/test/mock-chat.html?variant={variant}")
            page.wait_for_function(
                "() => { const b = document.querySelector('#ar-root .ar-bubble');"
                " const t = document.querySelector('#ar-root .ar-text');"
                " return !!(b && t) && !b.classList.contains('ar-typing') && t.textContent.length > 20; }",
                timeout=15000,
            )
            bubble_text = page.locator("#ar-root .ar-text").inner_text()
            check("Estou pronto para ajudar" in bubble_text,
                  f"[{variant}] leu a mensagem do assistente")
            check("pode me ajudar" not in bubble_text,
                  f"[{variant}] ignorou a mensagem do usuário")
            mode = page.evaluate("() => document.querySelector('#ar-root').dataset.arMode")
            check(mode == expect_mode,
                  f"[{variant}] modo de detecção = {mode!r} (esperado {expect_mode!r})")

        # 3. a primeira mensagem do assistente foi lida?
        page.goto(f"http://127.0.0.1:{PORT}/test/mock-chat.html?variant=role")
        page.wait_for_function(
            "() => { const b = document.querySelector('#ar-root .ar-bubble');"
            " const t = document.querySelector('#ar-root .ar-text');"
            " return !!(b && t) && !b.classList.contains('ar-typing') && t.textContent.length > 20; }",
            timeout=15000,
        )
        bubble_text = page.locator("#ar-root .ar-text").inner_text()
        check("Estou pronto para ajudar" in bubble_text,
              f"balão reproduziu a mensagem do assistente (obtido: {bubble_text[:60]!r})")
        check(page.locator("#ar-root .ar-badge-text").inner_text() != "",
              "etiqueta de reação preenchida")

        page.screenshot(path=os.path.join(SHOTS, "01-inicial.png"))

        # 3. reações: cada preset deve trocar a expressão do robô
        presets = [
            ("Perfeito! Consegui entregar tudo, parabéns pelo trabalho 🎉", "comemorando", "excited"),
            ("Sinceramente? Isso é muito ruim. Estou decepcionado 😞", "triste", "sad"),
            ("Não acredito! Que absurdo, odeio esse erro", "irritado", "angry"),
            ("Uau, que coisa incrível!! 😄🔥", "empolgado", "excited"),
            ("Hmm, deixa eu verificar isso antes de afirmar…", "pensando", "thinking"),
            ("Amo demais esse design, ficou lindo ❤️", "apaixonado", "love"),
        ]
        for i, (text, expect_label, expect_face) in enumerate(presets, start=2):
            page.get_by_role("button", name=expect_label.capitalize()).click()
            try:
                page.wait_for_function(
                    "label => document.querySelector('#ar-root .ar-badge-text').textContent === label",
                    arg=expect_label,
                    timeout=8000,
                )
            except Exception as exc:  # noqa: BLE001
                print("       (timeout aguardando rótulo)", exc)
            label = page.locator("#ar-root .ar-badge-text").inner_text().strip().lower()
            check(label == expect_label,
                  f"reação detectada = {label!r} (esperado {expect_label!r})")
            face = page.locator("#ar-root .ar-svg").get_attribute("data-face")
            check(face == expect_face, f"expressão {expect_label} -> {face!r} (esperado {expect_face!r})")
            page.wait_for_timeout(2800)
            shot = os.path.join(SHOTS, f"0{i}-{expect_label}.png")
            page.screenshot(path=shot)

        # 4. o robô anda? (posição do ator muda ao longo do tempo)
        pos = []
        for _ in range(10):
            pos.append(page.evaluate(
                "() => document.querySelector('#ar-root .ar-actor').style.transform"))
            page.wait_for_timeout(700)
        check(len(set(pos)) > 1, "robô se locomove pela tela (transform muda)")

        # 5. animação de reação aplicada no wrapper do robô
        page.get_by_role("button", name="Irritado").click()
        try:
            page.wait_for_function(
                "() => document.querySelector('#ar-root .ar-robot').className.includes('ar-react-')",
                timeout=8000,
            )
        except Exception as exc:  # noqa: BLE001
            print("       (timeout aguardando animação)", exc)
        cls = page.locator("#ar-root .ar-robot").get_attribute("class")
        check("ar-react-" in cls, f"classe de reação aplicada ({cls})")
        page.screenshot(path=os.path.join(SHOTS, "08-reacao-irritado.png"))

        ctx.close()

    print("\n" + ("=" * 60))
    if failures:
        print(f"FALHAS: {len(failures)}")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    print("TODOS OS TESTES PASSARAM")


if __name__ == "__main__":
    main()
