import os
  from ultralytics import YOLO

model = YOLO("models/ppe_best.pt")
print(model.names)
