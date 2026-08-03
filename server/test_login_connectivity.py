import requests
import json
import time

def test_login():
    url = "http://127.0.0.1:5000/api/auth/login"
    payload = {
        "email": "alex.j@edusphere.edu.in",
        "password": "student123"
    }
    headers = {"Content-Type": "application/json"}
    
    print(f"Attempting login to {url}...")
    start = time.time()
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        duration = time.time() - start
        print(f"Status Code: {response.status_code}")
        print(f"Duration: {duration:.2f}s")
        if response.status_code == 200:
            print("Login successful!")
            # print(json.dumps(response.json(), indent=2))
        else:
            print(f"Login failed: {response.text}")
    except Exception as e:
        print(f"Error during login: {e}")

if __name__ == "__main__":
    test_login()
