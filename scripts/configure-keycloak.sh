#!/bin/bash
# ====================================================================
# EcoRide - Script de configuración automatizada para Keycloak
# Configura el realm 'ecoride', el cliente OIDC y el Google Identity Provider.
#
# USO: GOOGLE_CLIENT_ID="tu_id" GOOGLE_CLIENT_SECRET="tu_secreto" bash scripts/configure-keycloak.sh
# ====================================================================

set -e

KEYCLOAK_URL=${KEYCLOAK_URL:-"http://localhost:30005"}
ADMIN_USER=${ADMIN_USER:-"admin"}
ADMIN_PASS=${ADMIN_PASS:-"admin123"}
CLIENT_SECRET=${CLIENT_SECRET:-"ecoride-client-secret-123456"}

if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "⚠️ Advertencia: No has provisto GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET."
  echo "Keycloak se configurará con credenciales de Google ficticias."
  echo "Podrás editarlas después desde la consola web."
  GOOGLE_CLIENT_ID="PLACEHOLDER_GOOGLE_CLIENT_ID"
  GOOGLE_CLIENT_SECRET="PLACEHOLDER_GOOGLE_CLIENT_SECRET"
fi

echo "🔑 Obteniendo token de administrador de Keycloak ($KEYCLOAK_URL)..."
TOKEN=$(curl -sf -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$TOKEN" ]; then
  echo "❌ Error al obtener token de administrador."
  exit 1
fi

echo "1️⃣ Creando Realm 'ecoride'..."
# Comprobamos si el realm ya existe para no fallar
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$KEYCLOAK_URL/admin/realms/ecoride")

if [ "$REALM_EXISTS" -eq 200 ]; then
  echo "   Realm 'ecoride' ya existe. Omitiendo creación."
else
  curl -sf -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "realm": "ecoride",
      "enabled": true,
      "displayName": "EcoRide Auth Realm"
    }'
  echo "   Realm 'ecoride' creado con éxito."
fi

echo "2️⃣ Creando Cliente OIDC 'ecoride-app'..."
CLIENT_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$KEYCLOAK_URL/admin/realms/ecoride/clients?clientId=ecoride-app" | grep -v "404" || echo "404")

# Creamos o actualizamos
curl -sf -X POST "$KEYCLOAK_URL/admin/realms/ecoride/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "ecoride-app",
    "enabled": true,
    "publicClient": false,
    "secret": "'"$CLIENT_SECRET"'",
    "redirectUris": [
      "http://localhost:8000/*",
      "http://127.0.0.1:8000/*",
      "http://localhost/*",
      "http://ecoride.duckdns.org/*"
    ],
    "webOrigins": [
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      "http://localhost",
      "http://ecoride.duckdns.org"
    ],
    "standardFlowEnabled": true
  }' || echo "   Cliente 'ecoride-app' ya existe o se actualizó."

echo "3️⃣ Configurando Proveedor de Identidad 'Google'..."
PROVIDER_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$KEYCLOAK_URL/admin/realms/ecoride/identity-provider/instances/google")

if [ "$PROVIDER_EXISTS" -eq 200 ]; then
  echo "   Proveedor Google ya existe. Actualizando credenciales..."
  curl -sf -X PUT "$KEYCLOAK_URL/admin/realms/ecoride/identity-provider/instances/google" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "alias": "google",
      "displayName": "Google",
      "providerId": "google",
      "enabled": true,
      "trustEmail": true,
      "storeToken": false,
      "config": {
        "clientId": "'"$GOOGLE_CLIENT_ID"'",
        "clientSecret": "'"$GOOGLE_CLIENT_SECRET"'"
      }
    }'
else
  curl -sf -X POST "$KEYCLOAK_URL/admin/realms/ecoride/identity-provider/instances" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "alias": "google",
      "displayName": "Google",
      "providerId": "google",
      "enabled": true,
      "trustEmail": true,
      "storeToken": false,
      "authenticateByDefault": false,
      "firstBrokerLoginFlowAlias": "first broker login",
      "config": {
        "clientId": "'"$GOOGLE_CLIENT_ID"'",
        "clientSecret": "'"$GOOGLE_CLIENT_SECRET"'"
      }
    }'
fi
echo "   Proveedor Google configurado con éxito."

echo ""
echo "🎉 Configuración de Keycloak finalizada correctamente."
echo "   Realm: ecoride"
echo "   Client ID: ecoride-app"
echo "   Client Secret: $CLIENT_SECRET"
echo "   Redirección de Google en Keycloak: $KEYCLOAK_URL/realms/ecoride/broker/google/endpoint"
echo ""
