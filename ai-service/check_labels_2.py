import os
import json
from ultralytics import YOLO

model = YOLO("models/ppe_best.pt")
with open("model_names.json", "w") as f:
    json.dump(model.names, f)
print(model.names)
