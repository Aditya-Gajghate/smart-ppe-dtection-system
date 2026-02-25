import requests
import os

def test_recognize():
    url = "http://localhost:8000/recognize"
    # Find a sample face image in the faces folder
    face_dir = "faces"
    sample_img = None
    for f in os.listdir(face_dir):
        if f.endswith(".jpg"):
            sample_img = f
            break
    
    if not sample_img:
        print("No sample images found.")
        return
        
    path = os.path.join(face_dir, sample_img)
    print(f"Testing recognition with: {path}")
    
    with open(path, "rb") as f:
        files = {"file": f}
        try:
            r = requests.post(url, files=files)
            print(f"Status: {r.status_code}")
            print(f"Response: {r.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_recognize()
