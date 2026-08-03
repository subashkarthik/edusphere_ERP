# EduSphere Enterprise Upgrade — Testing Protocol

Follow these steps to verify the Level 4 Enterprise SaaS transition.

---

## 1. Multi-Tenancy & Data Isolation
**Objective:** Ensure "College A" cannot see data from "College B".
*   **Step 1:** Create two users in the database with different `org_id`s (e.g., `ORG_ALPHA` and `ORG_BETA`).
*   **Step 2:** Log in as `User A`. Navigate to **Institutional CMS**. Create a course "Alpha Advanced Physics".
*   **Step 3:** Log in as `User B` in a private/incognito window. 
*   **Verification:** Navigate to **Institutional CMS** for `User B`. The course list must be empty or contain only `User B`'s specific institutional data. `Alpha Advanced Physics` must be invisible.

---

## 2. Faculty CMS Orchestration
**Objective:** Verify course lifecycle management.
*   **Step 1:** Navigate to the **Institutional CMS** tab in the sidebar.
*   **Step 2:** Click **"Create Course"**. Fill in the details (Code: `CS999`, Name: `Enterprise Architectures`).
*   **Step 3:** Check the **Inventory Grid**. The new course card should appear with "Active" status.
*   **Step 4 (Backend):** Query the `courses` table in the DB. Verify that the record contains your `org_id` and `faculty_id`.

---

## 3. Real-Time "Live Pulse" (WebSockets)
**Objective:** Verify cross-platform synchronization.
*   **Step 1:** Open the EduSphere Dashboard in **two different browser windows** (or one window and one incognito tab) using the same `org_id`.
*   **Step 2:** Observe the **"X LIVE"** indicator in the Header.
*   **Step 3:** Close one window. 
*   **Verification:** Within 1-3 seconds, the "LIVE" counter in the remaining window should automatically decrement, proving the WebSocket pulse is broadcasting correctly.

---

## 4. Collaborative Discussion Stream
**Objective:** Verify real-time classroom interaction.
*   **Step 1:** Navigate to **My Journey** -> Select a Course -> **Enter Classroom**.
*   **Step 2:** Open the **Discussion** tab in the right sidebar.
*   **Step 3:** Type a message "Hello Class!" and hit Send.
*   **Verification:** The message should appear instantly in the chat stream with a timestamp. If another user is in the same classroom, they will see the message appear without a page refresh.

---

## 5. Audit Intelligence Verification
**Objective:** Ensure institutional actions are tracked.
*   **Step 1:** Perform any major action (Login, Create Course, or Mark Attendance).
*   **Step 2 (Database):** Run the following SQL query:
    ```sql
    SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5;
    ```
*   **Verification:** You should see a record for your action, containing your `user_id`, the `resource_type` (e.g., COURSE), and the IP address from which the action was performed.

---

## 6. API Connectivity Test
**Objective:** Ensure all enterprise endpoints are healthy.
*   **Step 1:** Open your terminal and run the test script:
    ```bash
    python -m server.test_api
    ```
*   **Verification:** All endpoints (including the new `/api/cms` and `/api/intelligence` routes) should return `200 OK`.
