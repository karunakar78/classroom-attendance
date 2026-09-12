import os
import time

import obsws_python as obs
from dotenv import load_dotenv

load_dotenv()


# ==============================
# CONFIGURATION
# ==============================

OBS_HOST = os.environ["OBS_HOST"]
OBS_PORT = int(os.environ.get("OBS_PORT", 4455))
OBS_PASSWORD = os.environ["OBS_PASSWORD"]

SCENES = [
    "Scene 2",
    "Scene 3"
]

SWITCH_INTERVAL = 10


# ==============================
# CONNECT TO OBS
# ==============================

client = obs.ReqClient(
    host=OBS_HOST,
    port=OBS_PORT,
    password=OBS_PASSWORD
)

print("Connected to OBS")


# ==============================
# CAMERA LOOP
# ==============================

while True:

    for scene in SCENES:

        print(f"Switching to: {scene}")

        client.set_current_program_scene(scene)

        print(f"Showing {scene}")

        time.sleep(SWITCH_INTERVAL)