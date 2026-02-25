import face_recognition
import os
import numpy as np

def test_face_loading():
    face_dir = os.path.join(os.getcwd(), 'faces')
    if not os.path.exists(face_dir):
        print("Faces directory not found.")
        return
    
    files = [f for f in os.listdir(face_dir) if f.endswith(('.jpg', '.png'))]
    print(f"Found {len(files)} image files.")
    
    for filename in files:
        path = os.path.join(face_dir, filename)
        try:
            image = face_recognition.load_image_file(path)
            encoding = face_recognition.face_encodings(image)
            if encoding:
                print(f"PASS: {filename} - Loaded and encoded.")
            else:
                print(f"FAIL: {filename} - Loaded but no face found in image.")
        except Exception as e:
            print(f"ERROR: {filename} - {e}")

if __name__ == "__main__":
    test_face_loading()
