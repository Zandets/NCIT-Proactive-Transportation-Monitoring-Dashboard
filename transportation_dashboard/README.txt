Running the project for the first time:
1. open powershell
2. cd C:\academic\Research\proposal_grants\grants\2026_NCIT\implementations\transportation_dashboard
3. [SKIP IF VENV ALREADY EXISTS]Create a virtual location [ONLY ONCE IF THE PROJECT IS BEING EXECUTED FOR THE FIRST TIME, OTHERSWISE SKIP]
	$ python -m venv .venv
	$ .\.venv\Scripts\Activate.ps1 [IF POWERSHELL BLOCKS THE ACTIVATION: $ Set-ExecutionPolicy -Scope Process Bypass AND THEN AGAIN .\.venv\Scripts\Activate.ps1]
4. Install dependencies: python -m pip install -r requirements.txt
5. Start the server: python -m uvicorn app:app --host 127.0.0.1 --port 8000
6. Open in browser

Running the project for the second time:
1. open powershell
2. cd C:\academic\Research\proposal_grants\grants\2026_NCIT\implementations\transportation_dashboard
3. $Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   $.\.venv\Scripts\Activate.ps1
   $python -m uvicorn app:app --reload