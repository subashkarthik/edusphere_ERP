from services.legacy_sync import sync_agent

print("--- Running MS Access Real Data Sync ---")
res = sync_agent.run_sync()
print("Sync Result:", res)
