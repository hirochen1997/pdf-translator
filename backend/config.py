import os
from dotenv import load_dotenv

load_dotenv()

TENCENTCLOUD_SECRET_ID = os.getenv("TENCENTCLOUD_SECRET_ID", "")
TENCENTCLOUD_SECRET_KEY = os.getenv("TENCENTCLOUD_SECRET_KEY", "")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "20971520"))
DEFAULT_SERVICE = os.getenv("DEFAULT_SERVICE", "tencent")
DEFAULT_LANG_FROM = os.getenv("DEFAULT_LANG_FROM", "en")
DEFAULT_LANG_TO = os.getenv("DEFAULT_LANG_TO", "zh")

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tmp", "results")
os.makedirs(RESULTS_DIR, exist_ok=True)
