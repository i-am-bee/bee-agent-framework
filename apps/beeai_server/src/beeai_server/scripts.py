import os

def app():
    os.execvp("uvicorn", ["uvicorn", "beeai_server.application:app", "--host=0.0.0.0", "--port=8333"])
