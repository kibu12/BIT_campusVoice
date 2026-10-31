import os
import sys
import subprocess
import time

def run_suite():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    test_files = [
        "test_authentication.py",
        "test_authorization.py",
        "test_rag_security.py",
        "test_file_upload.py",
        "test_api_security.py"
    ]

    print("=" * 70)
    print("BIT CAMPUSVOICE -- PRODUCTION SECURITY VERIFICATION SUITE")
    print("=" * 70)
    start_all = time.time()
    all_passed = True
    results = []

    for test_file in test_files:
        test_path = os.path.join(base_dir, test_file)
        print(f"\n[RUNNING] {test_file}...")
        t0 = time.time()
        res = subprocess.run([sys.executable, test_path], capture_output=True, text=True)
        duration = round(time.time() - t0, 3)

        if res.returncode == 0:
            print(f"[PASSED]  {test_file} ({duration}s)")
            results.append((test_file, "PASSED", duration))
        else:
            print(f"[FAILED]  {test_file} ({duration}s)")
            print("-" * 50)
            print(res.stdout)
            print(res.stderr)
            print("-" * 50)
            results.append((test_file, "FAILED", duration))
            all_passed = False

    total_time = round(time.time() - start_all, 3)
    print("\n" + "=" * 70)
    print("SECURITY VERIFICATION SUMMARY")
    print("=" * 70)
    for name, status, dur in results:
        indicator = "[PASS]" if status == "PASSED" else "[FAIL]"
        print(f" {indicator:<8} {name:<28} [{dur}s]")
    print("=" * 70)
    print(f"Total Test Execution Time: {total_time}s")

    if all_passed:
        print("\nALL SECURITY VALIDATION GATES PASSED (Exit Code: 0).")
        print("Verdict: Security verification complete. Ready for production.")
        sys.exit(0)
    else:
        print("\nSECURITY GATE FAILURE DETECTED. Review errors above.")
        sys.exit(1)

if __name__ == "__main__":
    run_suite()
