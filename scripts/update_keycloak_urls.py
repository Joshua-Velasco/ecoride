import sys
import json
import urllib.request

keycloak_url = "http://localhost:30005"
admin_user = "admin"
admin_pass = "admin123"
client_id = "ecoride-app"
client_secret = "ecoride-client-secret-123456"

# 1. Obtain admin token
token_url = f"{keycloak_url}/realms/master/protocol/openid-connect/token"
token_data = urllib.parse.urlencode({
    "client_id": "admin-cli",
    "username": admin_user,
    "password": admin_pass,
    "grant_type": "password"
}).encode('utf-8')

req = urllib.request.Request(token_url, data=token_data)
try:
    with urllib.request.urlopen(req) as res:
        response = json.loads(res.read().decode('utf-8'))
        token = response['access_token']
except Exception as e:
    print(f"Error obtaining token: {e}")
    sys.exit(1)

# 2. Get client internal ID
clients_url = f"{keycloak_url}/admin/realms/ecoride/clients?clientId={client_id}"
req = urllib.request.Request(clients_url)
req.add_header("Authorization", f"Bearer {token}")
try:
    with urllib.request.urlopen(req) as res:
        clients = json.loads(res.read().decode('utf-8'))
        if not clients:
            print(f"Client {client_id} not found.")
            sys.exit(1)
        internal_id = clients[0]['id']
except Exception as e:
    print(f"Error finding client: {e}")
    sys.exit(1)

# 3. Update client configuration
update_url = f"{keycloak_url}/admin/realms/ecoride/clients/{internal_id}"
client_config = {
    "clientId": client_id,
    "enabled": True,
    "publicClient": False,
    "secret": client_secret,
    "redirectUris": [
        "http://localhost:8000/*",
        "http://127.0.0.1:8000/*",
        "http://localhost/*",
        "https://j161xg-ip-201-146-9-17.tunnelmole.net/*"
    ],
    "webOrigins": [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost",
        "https://j161xg-ip-201-146-9-17.tunnelmole.net"
    ],
    "standardFlowEnabled": True
}
update_data = json.dumps(client_config).encode('utf-8')
req = urllib.request.Request(update_url, data=update_data, method='PUT')
req.add_header("Authorization", f"Bearer {token}")
req.add_header("Content-Type", "application/json")

try:
    with urllib.request.urlopen(req) as res:
        print("Successfully updated client in Keycloak!")
except Exception as e:
    print(f"Error updating client: {e}")
    sys.exit(1)
