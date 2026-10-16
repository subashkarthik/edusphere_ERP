import os
import sys

# Ensure server dir is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment to the clean audit database
os.environ["DATABASE_URL"] = "postgresql://postgres:1407@localhost:5432/edusphere_audit"

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5000, log_level="info")
