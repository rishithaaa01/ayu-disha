import requests
import os

def test_render():
    url = "https://ayu-disha.onrender.com/api/asha/transcribe"
    print(f"Testing {url} ...")
    
    # Create a dummy audio file
    dummy_file_path = "test_audio.webm"
    with open(dummy_file_path, "wb") as f:
        f.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")
        
    try:
        with open(dummy_file_path, "rb") as f:
            files = {"file": ("voice_note.webm", f, "audio/webm")}
            response = requests.post(url, files=files)
            
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")
    finally:
        if os.path.exists(dummy_file_path):
            os.remove(dummy_file_path)

if __name__ == "__main__":
    test_render()
