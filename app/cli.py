import os
import sys
import importlib.util

server_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server")
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

server_cli_path = os.path.join(server_dir, "app", "cli.py")
spec = importlib.util.spec_from_file_location("server_app_cli", server_cli_path)
module = importlib.util.module_from_spec(spec)
sys.modules["server_app_cli"] = module
spec.loader.exec_module(module)

if __name__ == "__main__":
    module.main()
