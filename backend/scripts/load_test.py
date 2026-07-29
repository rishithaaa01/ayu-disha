import argparse
import asyncio
import time
import httpx
import math
from typing import List

async def worker(
    worker_id: int,
    url: str,
    headers: dict,
    stop_event: asyncio.Event,
    results: List[float],
    status_counts: dict,
    errors: List[str],
    client: httpx.AsyncClient
):
    while not stop_event.is_set():
        start_t = time.perf_counter()
        try:
            resp = await client.get(url, headers=headers)
            elapsed_ms = (time.perf_counter() - start_t) * 1000.0
            results.append(elapsed_ms)
            code = resp.status_code
            status_counts[code] = status_counts.get(code, 0) + 1
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_t) * 1000.0
            results.append(elapsed_ms)
            err_name = type(e).__name__
            status_counts[err_name] = status_counts.get(err_name, 0) + 1
            if len(errors) < 10:
                errors.append(str(e))

async def run_load_test(url: str, vus: int, duration: int):
    print("\n" + "=" * 60)
    print(f"STARTING BASELINE / LOAD TEST")
    print(f"Target URL       : {url}")
    print(f"Virtual Users    : {vus}")
    print(f"Duration         : {duration} seconds")
    print("=" * 60 + "\n")

    results: List[float] = []
    status_counts: dict = {}
    errors: List[str] = []
    stop_event = asyncio.Event()

    # Connection pooling with keep-alive for high concurrency
    limits = httpx.Limits(max_connections=vus * 4, max_keepalive_connections=vus * 2)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LoadTest/1.0",
        "Connection": "keep-alive",
        "Accept": "application/json"
    }
    timeout = httpx.Timeout(30.0, connect=15.0)

    async with httpx.AsyncClient(limits=limits, timeout=timeout, headers=headers) as client:
        # Spawn virtual users
        workers = [
            asyncio.create_task(
                worker(i, url, {}, stop_event, results, status_counts, errors, client)
            )
            for i in range(vus)
        ]

        start_time = time.perf_counter()
        
        # Run for specified duration
        await asyncio.sleep(duration)
        stop_event.set()

        # Wait for workers to finish current request
        await asyncio.gather(*workers, return_exceptions=True)
        total_time = time.perf_counter() - start_time

    # Calculate metrics
    total_requests = len(results)
    if total_requests == 0:
        print("[ERROR] No requests were completed.")
        return

    rps = total_requests / total_time
    sorted_results = sorted(results)
    min_rt = sorted_results[0]
    max_rt = sorted_results[-1]
    avg_rt = sum(sorted_results) / total_requests
    p95_rt = sorted_results[math.floor(total_requests * 0.95)]
    p99_rt = sorted_results[math.floor(total_requests * 0.99)]

    print("\n" + "=" * 60)
    print("LOAD TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total Requests Sent : {total_requests:,}")
    print(f"Actual Duration     : {total_time:.2f} seconds")
    print(f"Requests Per Second : {rps:.2f} req/sec")
    print("-" * 60)
    print("RESPONSE TIME METRICS")
    print(f"  * Average : {avg_rt:.2f} ms")
    print(f"  * Minimum : {min_rt:.2f} ms")
    print(f"  * Maximum : {max_rt:.2f} ms")
    print(f"  * P95     : {p95_rt:.2f} ms")
    print(f"  * P99     : {p99_rt:.2f} ms")
    print("-" * 60)
    print("STATUS CODE BREAKDOWN")
    for code, count in sorted(status_counts.items(), key=lambda x: str(x[0])):
        pct = (count / total_requests) * 100
        print(f"  * Status {code} : {count:,} ({pct:.1f}%)")
    print("=" * 60 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Baseline API Load Test Runner")
    parser.add_argument("--url", type=str, default="https://ayu-disha.onrender.com/", help="API target URL")
    parser.add_argument("--vus", type=int, default=100, help="Number of concurrent virtual users")
    parser.add_argument("--duration", type=int, default=60, help="Test duration in seconds")
    args = parser.parse_args()

    asyncio.run(run_load_test(args.url, args.vus, args.duration))

if __name__ == "__main__":
    main()
