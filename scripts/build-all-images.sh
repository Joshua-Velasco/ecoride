#!/bin/bash
# ====================================================================
# EcoRide - Script para compilar todas las imágenes Docker en el ECS
# ====================================================================

set -e

echo "🛠️ Iniciando compilación de imágenes Docker..."

# 1. Frontend
echo "📦 Compilando Frontend..."
docker build -t frontend:latest ./services/frontend

# 2. Identity Service
echo "📦 Compilando Identity Service..."
docker build -t identity-service:latest ./services/identity

# 3. Unlock Service
echo "📦 Compilando Unlock Service..."
docker build -t unlock-service:latest ./services/unlock

# 4. Payment Service
echo "📦 Compilando Payment Service..."
docker build -t payment-service:latest ./services/payment

# 5. Telemetry Service (Flask API)
# Nota: construimos usando el Dockerfile.api de servicios/telemetry
echo "📦 Compilando Telemetry Service..."
docker build -t telemetry-service:latest -f ./services/telemetry/Dockerfile.api ./services/telemetry

# 6. Telemetry Processor (Node.js Ingestion Pipeline)
# Nota: comparte el mismo código que telemetry pero corre con ecoride/telemetry-processor:latest
echo "📦 Compilando Telemetry Processor..."
docker build -t ecoride/telemetry-processor:latest ./services/telemetry

echo "🎉 ¡Compilación terminada con éxito!"
