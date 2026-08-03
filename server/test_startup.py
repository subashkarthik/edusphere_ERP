import sys
import os

print("--- Testing Legacy Sync Agent ---")
try:
    from services.legacy_sync import sync_agent
    sync_agent.run_sync()
except Exception as e:
    import traceback
    print("Sync Error:", e)
    traceback.print_exc()
