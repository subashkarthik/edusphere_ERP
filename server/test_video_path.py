import os
path = r"d:\My Projects\EduSphere\server\storage\videos\Cyber Security\Ethical Hacking\vidssave.com Ethical Hacking Full Course with AI in 90 Minutes (Beginner to Pro 2026) 1080P.mp4"
print(f"Path: {path}")
print(f"Exists: {os.path.isfile(path)}")
print(f"Size: {os.path.getsize(path) if os.path.isfile(path) else 'N/A'}")
