from playwright.sync_api import sync_playwright
import os

ARTIFACT_DIR = r"C:\Users\subas\.gemini\antigravity-ide\brain\f3f9a696-3464-4824-b2b5-764ab6d7aba9"
BASE_URL = "http://localhost:3000"

def capture_quizzes():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        def login_and_capture(ident, pwd, tab_name, out_name):
            page.goto(BASE_URL)
            page.wait_for_timeout(1000)
            page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
            page.goto(BASE_URL)
            page.wait_for_timeout(1200)

            page.locator('input[type="text"]').first.fill(ident)
            page.locator('input[type="password"]').first.fill(pwd)
            page.locator('button[type="submit"]').first.click()
            page.wait_for_timeout(2500)

            btn = page.locator(f'button:has-text("{tab_name}"), a:has-text("{tab_name}")').first
            if btn.count() > 0:
                btn.click()
                page.wait_for_timeout(1500)
                out_path = os.path.join(ARTIFACT_DIR, out_name)
                page.screenshot(path=out_path, full_page=False)
                print(f"Captured: {out_path}")

        login_and_capture("STUDENT_A", "StudentPass2026!", "Quizzes", "audit_proof_student_alpha_quizzes.png")
        login_and_capture("STUDENT_C", "StudentPass2026!", "Quizzes", "audit_proof_student_gamma_quizzes.png")
        browser.close()

if __name__ == "__main__":
    capture_quizzes()
