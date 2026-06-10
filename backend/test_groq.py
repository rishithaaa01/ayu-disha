import os
import asyncio
from dotenv import load_dotenv
from groq import AsyncGroq

async def test_groq():
    load_dotenv()
    api_key = os.environ.get("GROQ_API_KEY")
    print(f"Loaded key: {api_key[:10]}...{api_key[-10:] if api_key else 'None'}")
    if not api_key:
        print("ERROR: GROQ_API_KEY is not set in .env")
        return
        
    try:
        client = AsyncGroq(api_key=api_key)
        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": "Say hello",
                }
            ],
            model="llama-3.1-8b-instant",
        )
        print("SUCCESS! Groq API Response:")
        print(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Failed to query Groq: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
