"""Upload GigShield to HuggingFace Spaces — fast folder upload."""
from huggingface_hub import HfApi

REPO_ID = "LegendOP4/gigshield-demo"

api = HfApi()

print(f"Uploading to {REPO_ID}...")
api.upload_folder(
    folder_path=".",
    repo_id=REPO_ID,
    repo_type="space",
    ignore_patterns=[
        "**/node_modules/**",
        "**/.git/**",
        "**/__pycache__/**",
        "**/venv/**",
        "**/.env",
        "**/.env.*",
        "**/srv.txt",
        "**/*.ubj",
        "**/_ProjectB_Archive/**",
        "**/.gemini/**",
        "**/upload_hf.py",
        "**/*.exe",
        "**/.cache/**",
    ],
    commit_message="GigShield AI — Full Platform with OpenWeather + Auto-Payout",
)
print("Done! https://huggingface.co/spaces/LegendOP4/gigshield-demo")
