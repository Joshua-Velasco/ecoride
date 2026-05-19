#!/usr/bin/env python3
import time
import random
import json
import urllib.request
import subprocess
import sys

# Auto-instalar paho-mqtt para asegurar ejecución sin dependencias previas
try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("📦 paho-mqtt no detectado. Instalando automáticamente...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paho-mqtt"])
    import paho.mqtt.client as mqtt

import os

# Configuración
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
API_GATEWAY = os.getenv("API_GATEWAY", "http://localhost")

# Estado de los scooters simulados
scooters = {
    "SCOOT-01": {"lat": 19.4326, "lng": -99.1332, "battery": 95},
    "SCOOT-02": {"lat": 19.4335, "lng": -99.1340, "battery": 88},
    "SCOOT-03": {"lat": 19.4312, "lng": -99.1315, "battery": 92},
    "SCOOT-04": {"lat": 19.4350, "lng": -99.1352, "battery": 76}
}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Conectado con éxito al Broker MQTT EMQX")
    else:
        print(f"❌ Falló conexión al Broker MQTT, código de retorno: {rc}")

# Inicializar cliente MQTT
client = mqtt.Client()
client.on_connect = on_connect

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
except Exception as e:
    print(f"⚠️ No se pudo conectar a EMQX ({MQTT_BROKER}:{MQTT_PORT}): {e}")
    print("El simulador continuará generando solo tráfico HTTP de API.")

print("\n🚀 Iniciando Simulador de Tráfico EcoRide...")
print(f"   - Telemetría IoT -> MQTT (localhost:{MQTT_PORT})")
print(f"   - Peticiones API -> HTTP Gateway ({API_GATEWAY})\n")

tick = 0
try:
    while True:
        tick += 1

        # 1. Simular y publicar Telemetría de Scooters (cada 3 segundos)
        if tick % 3 == 0:
            for s_id, data in scooters.items():
                # Actualizar coordenadas simulando movimiento leve
                data["lat"] += random.uniform(-0.0005, 0.0005)
                data["lng"] += random.uniform(-0.0005, 0.0005)
                data["battery"] = max(10, data["battery"] - random.uniform(0.05, 0.15))
                
                payload = {
                    "scooterId": s_id,
                    "lat": round(data["lat"], 5),
                    "lng": round(data["lng"], 5),
                    "battery": int(data["battery"])
                }
                
                topic = f"ecoride/scooters/{s_id}/telemetry"
                try:
                    client.publish(topic, json.dumps(payload))
                    print(f"📡 MQTT [ecoride/scooters/{s_id}]: Lat={payload['lat']}, Lng={payload['lng']}, Batería={payload['battery']}%")
                except Exception as ex:
                    print(f"⚠️ Error publicando MQTT para {s_id}: {ex}")

        # 2. Simular Interacción del Frontend (HTTP calls cada 2 segundos)
        if tick % 2 == 0:
            endpoints = [
                ("GET", "/api/telemetry/scooters", None),
                ("POST", "/api/unlock/1", {"userId": 1}),
                ("POST", "/api/payment/checkout", {"amount": 10, "userId": 1})
            ]
            method, path, body = random.choice(endpoints)
            url = f"{API_GATEWAY}{path}"
            
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(body).encode("utf-8") if body else None,
                    headers={"Content-Type": "application/json"} if body else {},
                    method=method
                )
                with urllib.request.urlopen(req, timeout=3) as response:
                    status = response.status
                    # Leer fragmento para verificar validez
                    res_body = response.read().decode("utf-8")[:120]
                    print(f"🌐 HTTP {method} {path} -> {status} OK (Res: {res_body}...)")
            except urllib.error.HTTPError as he:
                print(f"🌐 HTTP {method} {path} -> {he.code} Error (Res: {he.read().decode('utf-8')[:120]})")
            except Exception as ex:
                print(f"🌐 HTTP {method} {path} -> Error: {ex}")

        time.sleep(1)

except KeyboardInterrupt:
    print("\n👋 Deteniendo simulador de tráfico.")
    client.loop_stop()
    client.disconnect()
