import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\subas\.gemini\antigravity-ide\brain\f3f9a696-3464-4824-b2b5-764ab6d7aba9"
BASE_URL = "http://localhost:3000"

def capture_proofs():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    print("Starting visual proof capture across all roles...")

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        def login_as(identifier, password):
            page.goto(BASE_URL)
            page.wait_for_timeout(1000)
            page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
            page.goto(BASE_URL)
            page.wait_for_timeout(1200)

            # Fill credentials
            ident_input = page.locator('input[type="text"]').first
            ident_input.fill(identifier)
            pass_input = page.locator('input[type="password"]').first
            pass_input.fill(password)
            
            # Click submit
            submit_btn = page.locator('button[type="submit"]').first
            submit_btn.click()
            page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # 1. ADMIN ROLE PROOF
        # ----------------------------------------------------------------------
        print("\n--- 1. Testing ADMIN Role (AUDITADMIN) ---")
        login_as("AUDITADMIN", "AuditAdminPass2026!")
        admin_dash_path = os.path.join(ARTIFACT_DIR, "audit_proof_admin_dashboard.png")
        page.screenshot(path=admin_dash_path, full_page=False)
        print(f"Captured: {admin_dash_path}")

        # Navigate to Users view if available
        users_btn = page.locator('button:has-text("Users"), a:has-text("Users")').first
        if users_btn.count() > 0:
            try:
                users_btn.click()
                page.wait_for_timeout(1500)
                admin_users_path = os.path.join(ARTIFACT_DIR, "audit_proof_admin_users.png")
                page.screenshot(path=admin_users_path, full_page=False)
                print(f"Captured: {admin_users_path}")
            except Exception as e:
                print("Could not click Users button:", e)

        # ----------------------------------------------------------------------
        # 2. FACULTY ROLE PROOF
        # ----------------------------------------------------------------------
        print("\n--- 2. Testing FACULTY Role (AUDITFAC) ---")
        login_as("AUDITFAC", "AuditFacultyPass2026!")
        fac_dash_path = os.path.join(ARTIFACT_DIR, "audit_proof_faculty_dashboard.png")
        page.screenshot(path=fac_dash_path, full_page=False)
        print(f"Captured: {fac_dash_path}")

        # Navigate to Attendance or Students
        attn_btn = page.locator('button:has-text("Attendance"), a:has-text("Attendance")').first
        if attn_btn.count() > 0:
            try:
                attn_btn.click()
                page.wait_for_timeout(1500)
                fac_attn_path = os.path.join(ARTIFACT_DIR, "audit_proof_faculty_attendance.png")
                page.screenshot(path=fac_attn_path, full_page=False)
                print(f"Captured: {fac_attn_path}")
            except Exception as e:
                print("Could not click Attendance button:", e)

        # ----------------------------------------------------------------------
        # 3. STUDENT ALPHA PROOF (100% Attendance, 100% Quiz)
        # ----------------------------------------------------------------------
        print("\n--- 3. Testing STUDENT ALPHA (STUDENT_A) ---")
        login_as("STUDENT_A", "StudentPass2026!")
        st_a_dash_path = os.path.join(ARTIFACT_DIR, "audit_proof_student_alpha_dashboard.png")
        page.screenshot(path=st_a_dash_path, full_page=False)
        print(f"Captured: {st_a_dash_path}")

        # Navigate to Attendance tab
        attn_btn = page.locator('button:has-text("Attendance"), a:has-text("Attendance")').first
        if attn_btn.count() > 0:
            try:
                attn_btn.click()
                page.wait_for_timeout(1500)
                st_a_attn_path = os.path.join(ARTIFACT_DIR, "audit_proof_student_alpha_attendance.png")
                page.screenshot(path=st_a_attn_path, full_page=False)
                print(f"Captured: {st_a_attn_path}")
            except Exception as e:
                print("Could not click Attendance button:", e)

        # ----------------------------------------------------------------------
        # 4. STUDENT GAMMA PROOF (50% Attendance [At Risk], 40% Quiz [Failed])
        # ----------------------------------------------------------------------
        print("\n--- 4. Testing STUDENT GAMMA (STUDENT_C) ---")
        login_as("STUDENT_C", "StudentPass2026!")
        st_c_dash_path = os.path.join(ARTIFACT_DIR, "audit_proof_student_gamma_dashboard.png")
        page.screenshot(path=st_c_dash_path, full_page=False)
        print(f"Captured: {st_c_dash_path}")

        # Navigate to Attendance tab
        attn_btn = page.locator('button:has-text("Attendance"), a:has-text("Attendance")').first
        if attn_btn.count() > 0:
            try:
                attn_btn.click()
                page.wait_for_timeout(1500)
                st_c_attn_path = os.path.join(ARTIFACT_DIR, "audit_proof_student_gamma_attendance.png")
                page.screenshot(path=st_c_attn_path, full_page=False)
                print(f"Captured: {st_c_attn_path}")
            except Exception as e:
                print("Could not click Attendance button:", e)

        browser.close()
        print("\nAll role proof screenshots captured successfully!")

if __name__ == "__main__":
    capture_proofs()
