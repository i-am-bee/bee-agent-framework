import os

def app():
    os.execvp("uvicorn", ["uvicorn", "beeai_api.application:app", "--host=0.0.0.0", "--port=8333"])
