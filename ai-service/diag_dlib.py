import face_recognition
import numpy as np
import cv2

def test():
    try:
        # Create a test RGB image
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        print(f"Testing with image: shape={img.shape}, dtype={img.dtype}")
        
        locations = face_recognition.face_locations(img)
        print(f"Success! Locations: {locations}")
    except Exception as e:
        print(f"Caught Exception: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test()
