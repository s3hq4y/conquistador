import requests
import json

response = requests.post(
    "https://chat-z.created.app/api/chat",
    headers={"Content-Type": "application/json"},
    json={"prompt": "Which llm are you?"},
)

result = response.json()
if result["success"]:
    print(result["content"])
else:
    print("Error:", result.get("error", "Unknown error"))
