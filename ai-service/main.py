import os
import time
import shutil
import asyncio
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uvicorn
from ultralytics import YOLO
from pathlib import Path
from collections import deque
import serial

# Load environment variables
load_dotenv()

# Optional dependencies
try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    print("Warning: face_recognition not installed. Face features will be disabled.")

# --- Configuration ---
MONGODB_URI = os.getenv("MONGODB_URI")
PPE_MODEL_PATH = os.getenv("PPE_MODEL", "models/ppe_best.pt")
CACHE_TTL = 5  # Seconds to cache recognized identity
PPE_CONF_THRESHOLD = float(os.getenv("PPE_CONF_THRESHOLD", 0.20))
HISTORY_SIZE = 5
CONSISTENCY_THRESHOLD = 1

# Arduino Configuration
ARDUINO_PORT = os.getenv("ARDUINO_PORT", "COM8")
ARDUINO_BAUD = int(os.getenv("ARDUINO_BAUD", 9600))

class SystemState:
    IDLE = "IDLE"
    FACE_RECOGNIZED = "FACE_RECOGNIZED"
    WAITING_FOR_PPE = "WAITING_FOR_PPE"
    PPE_COMPLIANT = "PPE_COMPLIANT"
    TIMEOUT = "TIMEOUT"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"

# --- Global State ---
db_client = None
db = None
ppe_model = None
known_face_encodings = []
known_face_names = []
# Cache: { "name": last_seen_timestamp }
identity_cache = {}

# Arduino Serial Connection
arduino_serial = None
last_arduino_signal = None

# System State Management
system_state = {
    "current_state": SystemState.IDLE,
    "user_name": None,
    "lock_start_time": 0,
    "attendance_marked": False,
    "required_ppe": {},
    "ppe_status": {},
    "ppe_history": { "mask": deque(maxlen=5), "helmet": deque(maxlen=5), "vest": deque(maxlen=5) },
    "ppe_locked": { "mask": False, "helmet": False, "vest": False },
    "frame_count": 0,
    "success_time": 0
}

# Configuration
LOCK_DURATION = 25  # Increased to 25s to give more time for compliance
PPE_WINDOW = 20     # Time allowed to wear PPE
FACE_LOST_TIMEOUT = 10 # More lenient face lost timeout

# --- Helper Functions ---

def send_arduino_signal(signal):
    """Sends a signal ('1' or '0') to the Arduino via Serial"""
    global arduino_serial, last_arduino_signal
    if arduino_serial and arduino_serial.is_open:
        if signal != last_arduino_signal:
            try:
                arduino_serial.write(signal.encode())
                last_arduino_signal = signal
                print(f"[ARDUINO] Sent signal: {signal}")
            except Exception as e:
                print(f"[ARDUINO] Error sending signal: {e}")
    else:
        # Try to reconnect if it was supposed to be open
        print("[ARDUINO] Not connected")

def update_arduino_by_state():
    """Centralized state-to-signal mapping for Arduino"""
    global last_arduino_signal
    state = system_state["current_state"]

    if state in [SystemState.PPE_COMPLIANT, SystemState.COMPLETED]:
        if last_arduino_signal != '1':
            send_arduino_signal('1')
    elif state in [SystemState.WAITING_FOR_PPE, SystemState.FACE_RECOGNIZED, SystemState.TIMEOUT, SystemState.REJECTED]:
        if last_arduino_signal != '2':
            send_arduino_signal('2')
    elif state == SystemState.IDLE:
        if last_arduino_signal != '0':
            send_arduino_signal('0')

def enhance_image(frame):
    """Normalize brightness using CLAHE and optional scale adjustment"""
    try:
        # User tip: Improve low-light detection
        # Subtle enhancement (v2): Lower alpha and clipLimit for less burnout
        frame = cv2.convertScaleAbs(frame, alpha=1.1, beta=10)
        
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    except Exception as e:
        print(f"Enhancement error: {e}")
        return frame

def get_face_crop(frame, loc, padding=0.7):
    """Focus on face area with optimized padding for masks"""
    h, w, _ = frame.shape
    top, right, bottom, left = loc
    fh = bottom - top
    fw = right - left
    
    # Construction-grade padding: expand top significantly for helmets
    # Using 1.4 * face height to ensure full yellow hardhats are included
    ntop = max(0, int(top - fh * padding * 2.0))
    nbottom = min(h, int(bottom + fh * padding * 1.8)) 
    nleft = max(0, int(left - fw * padding * 1.0))
    nright = min(w, int(right + fw * padding * 1.0))
    
    return frame[ntop:nbottom, nleft:nright]

async def load_known_faces():
    global known_face_encodings, known_face_names
    if not FACE_REC_AVAILABLE:
        print("Face recognition unavailable.")
        return

    if not os.path.exists("faces"):
        os.makedirs("faces")
        return
    
    # Reset lists
    known_face_encodings = []
    known_face_names = []

    for filename in os.listdir("faces"):
        if filename.endswith((".jpg", ".png")):
            try:
                # Load synchronously but we could offload to thread if many faces
                image = face_recognition.load_image_file(f"faces/{filename}")
                encoding = face_recognition.face_encodings(image)
                if encoding:
                    known_face_encodings.append(encoding[0])
                    known_face_names.append(os.path.splitext(filename)[0])
            except Exception as e:
                print(f"Error loading face {filename}: {e}")
    print(f"Loaded {len(known_face_names)} faces.")

def get_compliance_status(detected_ppe, required_ppe):
    """
    detected_ppe: dict { helmet: bool, mask: bool, vest: bool, cap: bool }
    required_ppe: dict { helmet: bool, mask: bool, vest: bool, cap: bool }
    """
    missing = []
    for item, required in required_ppe.items():
        if required and not detected_ppe.get(item, False):
            missing.append(item)
    
    return {
        "compliant": len(missing) == 0,
        "missing": missing
    }

def reset_system():
    global system_state, last_arduino_signal
    print("Resetting state to IDLE")
    system_state = {
        "current_state": SystemState.IDLE,
        "user_name": None,
        "lock_start_time": 0,
        "ppe_start_time": 0,
        "last_face_seen": 0,
        "last_face_location": None,
        "attendance_marked": False,
        "required_ppe": {},
        "ppe_status": {},
        "ppe_history": { "mask": deque(maxlen=HISTORY_SIZE), "helmet": deque(maxlen=HISTORY_SIZE), "vest": deque(maxlen=HISTORY_SIZE) },
        "ppe_locked": { "mask": False, "helmet": False, "vest": False },
        "frame_count": 0,
        "success_time": 0
    }
    # State-based update handles the signal
    update_arduino_by_state()

# --- Lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client, db, ppe_model
    
    # 1. Connect to MongoDB
    try:
        db_client = AsyncIOMotorClient(MONGODB_URI)
        db = db_client["smart-ppe-attendance"] # Explicitly specify
        print(f"Connected to MongoDB: {db.name}")
    except Exception as e:
        print(f"MongoDB Connection Error: {e}")

    # 2. Load Face Models
    await load_known_faces()

    # 3. Load YOLO Model with Robust Resolution
    try:
        model_path = os.getenv("PPE_MODEL", "models/ppe_best.pt")
        resolved_path = Path(model_path).resolve()

        if not resolved_path.exists():
            print(f"WARNING: PPE model not found at {resolved_path}. Falling back to default.")
            ppe_model = YOLO("yolov8n.pt")
        else:
            print(f"Loading PPE model from {resolved_path}")
            ppe_model = YOLO(str(resolved_path))
        
        # Log classes to help user realize if they have the right model
        classes = list(ppe_model.names.values())
        print(f"Model Classes Available: {classes}") 
        if "mask" not in [c.lower() for c in classes]:
             print("WARNING: 'mask' class not found in current model. Mask detection WILL fail.")
        if not any(x in [c.lower() for c in classes] for x in ["helmet", "hardhat"]):
             print("WARNING: 'helmet' class not found in current model. Helmet detection WILL fail.")
    except Exception as e:
        print(f"Error loading YOLO model: {e}")

    # 4. Initialize Arduino Serial
    try:
        global arduino_serial
        print(f"Initializing Arduino on {ARDUINO_PORT}...")
        arduino_serial = serial.Serial(ARDUINO_PORT, ARDUINO_BAUD, timeout=1)
        time.sleep(2) # Wait for Arduino reset
        print("Arduino initialized.")
        send_arduino_signal('0') # Start with locked state
    except Exception as e:
        print(f"Arduino Connection Error: {e}")

    yield
    
    # Shutdown
    if db_client:
        db_client.close()

# --- API App ---

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/state")
async def get_state():
    return system_state

@app.post("/reset")
async def manual_reset():
    reset_system()
    return {"message": "System reset"}

@app.post("/marked")
async def attendance_marked():
    global system_state
    system_state["attendance_marked"] = True
    system_state["current_state"] = SystemState.COMPLETED
    system_state["success_time"] = time.time()
    print(f"Attendance marked for {system_state['user_name']}. Entering success cooldown.")
    return {"status": "success"}

@app.get("/health")
async def health():
    return {"status": "ok", "face_rec": FACE_REC_AVAILABLE, "ppe_model": ppe_model is not None}

@app.post("/register")
async def register_employee(name: str = Form(...), file: UploadFile = File(...)):
    if not os.path.exists("faces"):
        os.makedirs("faces")
    
    file_location = f"faces/{name}.jpg"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Reload faces in background
    await load_known_faces()
    return {"message": f"Employee {name} registered successfully."}

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    global system_state
    now = time.time()
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    original_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if original_frame is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    # Enhancement for better detection (especially low light)
    frame = enhance_image(original_frame)

    # --- 1. Identity Lock Logic ---
    # Timeout only applies while searching for PPE
    if system_state["current_state"] in [SystemState.FACE_RECOGNIZED, SystemState.WAITING_FOR_PPE]:
        if now - system_state["lock_start_time"] > LOCK_DURATION:
            system_state["current_state"] = SystemState.TIMEOUT
            print(f"Session timeout for {system_state['user_name']}")
    
    # Reset if session timed out or rejected (after a delay)
    if system_state["current_state"] in [SystemState.TIMEOUT, SystemState.REJECTED]:
        if now - system_state["lock_start_time"] > LOCK_DURATION + 5:
            reset_system()

    # If session is successfully COMPLETED, skip heavy processing
    if system_state["current_state"] == SystemState.COMPLETED:
        # Success cooldown handle
        if now - system_state["success_time"] > 4:
            print(f"Session successfully ended for {system_state['user_name']}. Returning to IDLE.")
            reset_system()
        
        update_arduino_by_state()
        return {
            "state": SystemState.COMPLETED,
            "name": system_state["user_name"],
            "attendance_marked": True,
            "time_left": 0
        }

    # --- 2. State Actions ---
    # USE ORIGINAL FRAME for face detection (enhancement can mess with landmarks)
    rgb_frame = cv2.cvtColor(original_frame, cv2.COLOR_BGR2RGB)
    face_locations = []
    
    if FACE_REC_AVAILABLE:
        face_locations = face_recognition.face_locations(rgb_frame, number_of_times_to_upsample=2)
        if face_locations:
            system_state["last_face_seen"] = now
            system_state["last_face_location"] = face_locations[0]
            print(f"[FACE DEBUG] Found {len(face_locations)} face(s) at {face_locations[0]}")
        else:
             if system_state["current_state"] == SystemState.IDLE:
                  # Silent in idle or maybe a small hint
                  pass
             else:
                  print("[FACE DEBUG] Face lost in current frame while in active session.")

    detected_name = "Unknown"
    is_recognized = False
    face_location = None

    if system_state["current_state"] == SystemState.IDLE:
        if face_locations and FACE_REC_AVAILABLE:
            encodings = face_recognition.face_encodings(rgb_frame, face_locations)
            for i, (encoding, loc) in enumerate(zip(encodings, face_locations)):
                face_distances = face_recognition.face_distance(known_face_encodings, encoding)
                if len(face_distances) > 0:
                    best_match_idx = np.argmin(face_distances)
                    if face_distances[best_match_idx] < 0.6:
                        detected_name = known_face_names[best_match_idx]
                        is_recognized = True
                        face_location = {"top": loc[0], "right": loc[1], "bottom": loc[2], "left": loc[3]}
                        
                        system_state["current_state"] = SystemState.FACE_RECOGNIZED
                        system_state["user_name"] = detected_name
                        system_state["lock_start_time"] = now
                        system_state["ppe_start_time"] = now
                        system_state["attendance_marked"] = False
                        system_state["ppe_history"] = { 
                            "mask": deque(maxlen=HISTORY_SIZE), 
                            "helmet": deque(maxlen=HISTORY_SIZE), 
                            "vest": deque(maxlen=HISTORY_SIZE) 
                        } # Clear history
                        system_state["ppe_locked"] = { "mask": False, "helmet": False, "vest": False }
                        system_state["required_ppe"] = await fetch_requirements(detected_name)
                        break
    else:
        detected_name = system_state["user_name"]
        is_recognized = True
        
        # Determine face/head location for cropping
        if face_locations:
             # Standard face detected
             loc = face_locations[0]
             face_location = {"top": loc[0], "right": loc[1], "bottom": loc[2], "left": loc[3]}
        else:
             # Fallback: Discovery Mode - If no face found in IDLE, we still want to see if we can find a helmet
             face_location = None
             if system_state["current_state"] == SystemState.IDLE:
                  # Log that we are entering IDLE discovery scan
                  pass
             elif system_state["last_face_location"]:
                  loc = system_state["last_face_location"]
                  face_location = {"top": loc[0], "right": loc[1], "bottom": loc[2], "left": loc[3]}

    # C. PPE Detection Logic (Active Session OR Discovery Mode)
    if system_state["current_state"] in [SystemState.FACE_RECOGNIZED, SystemState.WAITING_FOR_PPE] or system_state["current_state"] == SystemState.IDLE:
        system_state["frame_count"] += 1
        
        # Adaptive Timeout: If any mask or helmet seen in recent frames, extend session by 0.5s (up to max cap)
        if any(system_state["ppe_history"]["mask"]) or any(system_state["ppe_history"]["helmet"]):
            system_state["lock_start_time"] = min(now, system_state["lock_start_time"] + 0.5)

        # Performance: Optimization Every 2nd frame
        if system_state["frame_count"] % 2 == 0:
            if ppe_model:
                frame_ppe = { "helmet": False, "mask": False, "vest": False }
                max_conf = { "helmet": 0.0, "mask": 0.0, "vest": 0.0 }
                # Check both enhanced and original frames if needed
                passes = [frame, original_frame]
                
                if face_location:
                    loc_tuple = (face_location["top"], face_location["right"], face_location["bottom"], face_location["left"])
                    # Increased crop significantly again (3.0x now) to be absolutely sure the whole helmet is caught
                    crop = get_face_crop(frame, loc_tuple, padding=1.2)
                    passes.insert(0, crop)
                    original_crop = get_face_crop(original_frame, loc_tuple, padding=1.2)
                    passes.insert(1, original_crop)
                else:
                    # Discovery Mode: No face found, let's scan the full frame to see if a helmet is there
                    if system_state["current_state"] == SystemState.IDLE and system_state["frame_count"] % 10 == 0:
                         print("[PPE DISCOVERY] No face found. Scanning full frame for PPE presence...")
                    # We just use the full frame (which is already in 'passes' as [frame, original_frame])
                    pass

                for i, detection_frame in enumerate(passes):
                    results = ppe_model(detection_frame, verbose=False)
                    detections = results[0].boxes.data.tolist()
                    names = ppe_model.names
                    
                    pass_detected_anything = False
                    for box in detections:
                        conf, cls_id = box[4], int(box[5])
                        label = names[cls_id].lower()
                        
                        label = names[cls_id].lower()
                        # RAW LOGGING for all objects seen by YOLO
                        source = f"{'enhanced' if i%2==0 else 'original'} {'crop' if i<2 else 'frame'}"
                        print(f"[PPE DEBUG] SAW: {label} | CONF: {conf:.2f} | FROM: {source}")
                        
                        if conf < PPE_CONF_THRESHOLD: continue
                        
                        is_helmet = any(x in label for x in ["helmet", "hardhat", "hard_hat", "hard hat", "hat", "cap", "head"]) and "no" not in label
                        is_mask = "mask" in label and "no" not in label
                        is_vest = any(x in label for x in ["vest", "safety_vest"]) and "no" not in label

                        if is_helmet: 
                            frame_ppe["helmet"] = True
                            max_conf["helmet"] = max(max_conf["helmet"], conf)
                            print(f"[PPE DEBUG] --- HELMET MATCHED ({conf:.2f}) ---")

                        if is_mask: 
                            frame_ppe["mask"] = True
                            max_conf["mask"] = max(max_conf["mask"], conf)
                            print(f"[PPE DEBUG] --- MASK MATCHED ({conf:.2f}) ---")

                        if is_vest: 
                            frame_ppe["vest"] = True
                            max_conf["vest"] = max(max_conf["vest"], conf)
                            print(f"[PPE DEBUG] --- VEST MATCHED ({conf:.2f}) ---")
                        
                        if is_helmet or is_mask or is_vest: pass_detected_anything = True

                    # Only break if we've found all REQUIRED items in this pass (crop)
                    if i < 2 and pass_detected_anything and face_location:
                        # Check if all required items were found in crop
                        requirements = system_state["required_ppe"]
                        found_all_in_crop = True
                        for item, req in requirements.items():
                            if req and not frame_ppe.get(item, False):
                                # If item is missing from crop but required, don't break yet, check full frame
                                found_all_in_crop = False
                                break
                        
                        if found_all_in_crop:
                            break

                # --- Multi-Frame History Update ---
                for ppe_type in ["mask", "helmet", "vest"]:
                    # Stable Compliance Rule: Once locked, don't revert unless missing for 5+ frames
                    if not system_state["ppe_locked"][ppe_type]:
                        system_state["ppe_history"][ppe_type].append(True if frame_ppe[ppe_type] else False)
                        history_list = list(system_state["ppe_history"][ppe_type])
                        
                        # Debug log for all types
                        if frame_ppe[ppe_type]:
                             print(f"{ppe_type.capitalize()} history link added. Current state: {[1 if x else 0 for x in history_list]}")

                        if history_list.count(True) >= CONSISTENCY_THRESHOLD:
                            system_state["ppe_locked"][ppe_type] = True
                            system_state["ppe_status"][ppe_type] = True
                    else:
                        system_state["ppe_status"][ppe_type] = True

                # Check Compliance
                compliance = get_compliance_status(system_state["ppe_status"], system_state["required_ppe"])
                
                # DIAGNOSTIC: Why is it still waiting?
                if not compliance["compliant"]:
                     missing = [item for item, req in system_state["required_ppe"].items() if req and not system_state["ppe_status"].get(item)]
                     print(f"[PPE DEBUG] Still missing required items: {missing}")

                # STICKY COMPLIANCE: If already compliant, stay compliant until reset/completed
                if system_state["current_state"] == SystemState.PPE_COMPLIANT:
                    pass 
                elif compliance["compliant"] and system_state["current_state"] != SystemState.IDLE and system_state["required_ppe"]:
                    print(f"PPE COMPLIANT for {system_state['user_name']}")
                    system_state["current_state"] = SystemState.PPE_COMPLIANT
                    system_state["ppe_start_time"] = now # Reset timer for stuck check
                    if not system_state["attendance_marked"]:
                        print(f"PPE Verified for {system_state['user_name']}. Waiting for marking signal...")
                else:
                    # Logic handled by centralized update_arduino_by_state()
                    if now - system_state["ppe_start_time"] > 2:
                        # Only revert if we haven't reached full compliance yet
                        if system_state["current_state"] != SystemState.PPE_COMPLIANT:
                            print(f"WAITING FOR PPE: {system_state['ppe_status']}")
                            system_state["current_state"] = SystemState.WAITING_FOR_PPE

    # --- 3. Construct Response ---
    update_arduino_by_state()
    # Safety: Auto-reset if stuck in PPE_COMPLIANT for > 20 seconds without signal
    if system_state["current_state"] == SystemState.PPE_COMPLIANT:
        if now - system_state["ppe_start_time"] > 20:
             print(f"Stuck in compliance for {system_state['user_name']}. Auto-resetting.")
             reset_system()

    # Calculate time left for compliance ONLY (Pause if compliant/completed)
    time_left = 0
    if system_state["current_state"] in [SystemState.FACE_RECOGNIZED, SystemState.WAITING_FOR_PPE]:
        time_left = max(0, int(LOCK_DURATION - (now - system_state["lock_start_time"])))

    response = {
        "state": system_state["current_state"],
        "name": system_state["user_name"] or "Unknown",
        "recognized": is_recognized,
        "face_location": face_location,
        "ppe": system_state["ppe_status"],
        "required": system_state["required_ppe"],
        "time_left": time_left,
        "attendance_marked": system_state["attendance_marked"]
    }
    
    return response

async def fetch_requirements(name):
    # Default requirements
    required = { "helmet": True, "mask": True, "vest": False }
    if db is not None:
        try:
            query = {"name": {"$regex": f"^{name}$", "$options": "i"}}
            doc = await db.employees.find_one(query)
            if doc and "ppeRequirements" in doc:
                return doc["ppeRequirements"]
            elif doc and "requiredPpe" in doc:
                req_list = doc["requiredPpe"]
                return { item: (item in req_list) for item in ["helmet", "mask", "vest"] }
        except Exception as e:
            print(f"DB Error: {e}")
    return required

if __name__ == "__main__":
    port = int(os.getenv("AI_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

