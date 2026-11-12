import urllib.request
import urllib.parse
import http.cookiejar
import json
import os

BASE_URL = os.getenv("JENKINS_BASE_URL", "http://127.0.0.1:8080")
AUTH_USER = os.getenv("JENKINS_ADMIN_USER", "admin")
AUTH_PASS = os.getenv("JENKINS_ADMIN_PASSWORD")
JOB_NAME = "ResQGrid-CI-CD"

if not AUTH_PASS:
    raise SystemExit("Error: Set JENKINS_ADMIN_PASSWORD environment variable before running.")

# Setup basic auth & cookie jar
cj = http.cookiejar.CookieJar()
auth_handler = urllib.request.HTTPBasicAuthHandler()
auth_handler.add_password(realm=None, uri=BASE_URL, user=AUTH_USER, passwd=AUTH_PASS)
opener = urllib.request.build_opener(auth_handler, urllib.request.HTTPCookieProcessor(cj))

# 1. Fetch CSRF crumb
crumb_req = urllib.request.Request(f"{BASE_URL}/crumbIssuer/api/json")
with opener.open(crumb_req) as resp:
    crumb_data = json.loads(resp.read().decode('utf-8'))
    crumb = crumb_data["crumb"]
    crumb_field = crumb_data["crumbRequestField"]

print(f"Retrieved CSRF crumb: {crumb[:8]}...")

# 2. Read XML
xml_file = "resqgrid-security-job.xml"
with open(xml_file, "r", encoding="utf-8") as f:
    xml_data = f.read().encode('utf-8')

# 3. Post updated configuration to Jenkins job
post_req = urllib.request.Request(
    f"{BASE_URL}/job/{JOB_NAME}/config.xml",
    data=xml_data,
    headers={
        "Content-Type": "application/xml",
        crumb_field: crumb
    },
    method="POST"
)

with opener.open(post_req) as resp:
    print(f"Successfully updated Jenkins job {JOB_NAME}! HTTP {resp.status}")
