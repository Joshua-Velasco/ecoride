#!/bin/bash

# EcoRide - Script de Demostración de Elasticidad Horizontal (HPA)
echo "🚀 Iniciando Demostración de Auto-Escalado (HPA) para Payment Service..."

echo "1️⃣ Aplicando límites de recursos en el clúster..."
kubectl apply -f k8s/ecoride-cluster.yaml

echo "2️⃣ Aplicando el Horizontal Pod Autoscaler (HPA)..."
kubectl apply -f k8s/hpa-payment.yaml

echo "✅ HPA configurado. Estado actual:"
kubectl get hpa payment-hpa

echo ""
echo "⚠️ ATENCIÓN: Se requiere tener Metrics Server instalado en tu clúster."
echo "Si ves 'unknown' bajo TARGETS, espera unos minutos o instala metrics-server con:"
echo "kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml"
echo ""

echo "💥 Generando ataque de tráfico al API Gateway (Puerto 9080) / Pago Simulado..."
echo "(Usando Apache Bench vía Docker. Presiona Ctrl+C para detener el ataque)"
echo ""

# Hacemos un ataque simulando 50 usuarios concurrentes, 50,000 peticiones al servicio de pagos.
# Usando bombardier (una excelente herramienta de carga en HTTP)
docker run --rm -it alpine/bombardier -c 100 -n 100000 -m POST "http://ecoride.duckdns.org/api/payment/checkout"
