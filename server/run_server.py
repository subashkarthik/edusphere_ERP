import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env to get the production DATABASE_URL
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
import dotenv
dotenv.load_dotenv(env_path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5000, log_level="info")
