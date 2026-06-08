import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv(".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

for m in genai.list_models():
    if "flash" in m.name:
        print(f"Model Name: {m.name}, Supported Methods: {m.supported_generation_methods}")
