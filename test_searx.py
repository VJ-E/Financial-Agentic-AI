import httpx
import asyncio

async def test():
    instances = [
        "https://searx.work",
        "https://paulgo.io",
        "https://search.ononoki.org",
        "https://priv.au",
        "https://searx.tiekoetter.com"
    ]
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        for instance in instances:
            try:
                r = await client.get(f"{instance}/search", params={'q': 'gold price', 'format': 'json'}, headers=headers)
                print(f"{instance}: {r.status_code}")
                if r.status_code == 200:
                    print("SUCCESS:", r.text[:200])
            except Exception as e:
                print(f"{instance}: ERROR - {str(e)}")

asyncio.run(test())
