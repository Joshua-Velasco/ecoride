#!/bin/bash
# =========================================================
# EcoRide - Script de restauración de rutas APISIX
# Ejecuta este script si vuelves a borrar el namespace de
# APISIX con kubectl delete -f k8s/ && kubectl apply -f k8s/
#
# USO: bash scripts/restore-apisix.sh
# =========================================================

set -e

ADMIN_KEY="1234567890abcdef1234567890abcdef"
LOCAL_PORT=19180

echo "🔍 Esperando que el pod de APISIX esté listo..."
kubectl wait --for=condition=ready pod -l app=apisix -n apisix --timeout=120s

echo "📡 Iniciando port-forward al Admin API de APISIX en el puerto $LOCAL_PORT..."
kubectl port-forward -n apisix deploy/apisix ${LOCAL_PORT}:9180 &
PF_PID=$!
sleep 3

echo "✅ Verificando conexión al Admin API..."
if ! curl -sf -H "X-API-KEY: $ADMIN_KEY" http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes > /dev/null; then
  echo "❌ No se pudo conectar al Admin API. Asegúrate de que el pod apisix esté corriendo."
  kill $PF_PID 2>/dev/null
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Habilitando plugin Prometheus globalmente..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X PUT \
  -H "X-API-KEY: $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "plugins": {
      "prometheus": {}
    }
  }' http://127.0.0.1:$LOCAL_PORT/apisix/admin/global_rules/1 | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ OK -', d.get('key',''))"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Creando ruta pública de métricas de Prometheus..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X PUT \
  -H "X-API-KEY: $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "uri": "/apisix/prometheus/metrics",
    "name": "prometheus-metrics",
    "plugins": {
      "public-api": {}
    }
  }' http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes/prometheus-metrics | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ OK -', d.get('key',''))"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Creando ruta: Identity Service (/api/identity/*)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X PUT \
  -H "X-API-KEY: $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "uri": "/api/identity/*",
    "name": "identity-route",
    "priority": 10,
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "identity-service.default.svc.cluster.local:3000": 1
      }
    }
  }' http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes/identity-route | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ OK -', d.get('key',''))"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Creando ruta: Payment Service (/api/payment/checkout)"
echo "   (con proxy-rewrite -> /api/payments/checkout)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X PUT \
  -H "X-API-KEY: $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "uri": "/api/payment/checkout",
    "name": "payment-route",
    "priority": 10,
    "plugins": {
      "proxy-rewrite": {
        "uri": "/api/payments/checkout"
      }
    },
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "payment-service.default.svc.cluster.local:3000": 1
      }
    }
  }' http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes/payment-route | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ OK -', d.get('key',''))"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Creando ruta: Unlock Service (/api/unlock/*)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X PUT \
  -H "X-API-KEY: $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "uri": "/api/unlock/*",
    "name": "unlock-route",
    "priority": 10,
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "unlock-service.default.svc.cluster.local:3000": 1
      }
    }
  }' http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes/unlock-route | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ OK -', d.get('key',''))"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Creando ruta: Telemetry Service (/api/telemetry/scooters)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X PUT \
  -H "X-API-KEY: $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "uri": "/api/telemetry/scooters",
    "name": "telemetry-route",
    "priority": 10,
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "telemetry-service.default.svc.cluster.local:3000": 1
      }
    }
  }' http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes/telemetry-route | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ OK -', d.get('key',''))"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Creando ruta: Frontend Service Catch-All (/*)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X PUT \
  -H "X-API-KEY: $ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "uri": "/*",
    "name": "frontend-route",
    "priority": 0,
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "frontend-service.default.svc.cluster.local:80": 1
      }
    }
  }' http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes/frontend-route | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ OK -', d.get('key',''))"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Verificando todas las rutas registradas:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -H "X-API-KEY: $ADMIN_KEY" http://127.0.0.1:$LOCAL_PORT/apisix/admin/routes \
  | python3 -c "import sys,json; data=json.load(sys.stdin); [print('  ✅', r['value'].get('name','?'), '->', r['value'].get('uri','?'), ' (Priority:', r['value'].get('priority', 0), ')') for r in data.get('list',[])]"

echo ""
echo "🎉 ¡Restauración completa! APISIX está configurado y listo."
echo ""
echo "💡 Tip: Recuerda inicializar el schema de PostgreSQL si también lo borraste:"
echo "   cat k8s/init.sql | kubectl exec -i deploy/postgres-db -- psql -U postgres -d ecoride"
echo ""

kill $PF_PID 2>/dev/null
