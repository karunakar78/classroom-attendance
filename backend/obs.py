import time
import obsws_python as obs


# ==============================
# CONFIGURATION
# ==============================

OBS_HOST = "10.120.70.38"
OBS_PORT = 4455
OBS_PASSWORD = "9ZAomL6YKDNDyyYr"

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