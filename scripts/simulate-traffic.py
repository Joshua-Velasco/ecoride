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
    "SCOOT-01": {"lat": 19.4330, "lng": -99.1332, "battery": 85},
    "SCOOT-02": {"lat": 19.4340, "lng": -99.1340, "battery": 65},
    "SCOOT-03": {"lat": 19.4320, "lng": -99.1320, "battery": 92},
    "SCOOT-04": {"lat": 19.4350, "lng": -99.1350, "battery": 45},
    "SCOOT-05": {"lat": 19.4280, "lng": -99.1410, "battery": 78},
    "SCOOT-06": {"lat": 19.4290, "lng": -99.1390, "battery": 55},
    "SCOOT-07": {"lat": 19.4310, "lng": -99.1370, "battery": 100},
    "SCOOT-08": {"lat": 19.4300, "lng": -99.1380, "battery": 15},
    "SCOOT-09": {"lat": 19.4380, "lng": -99.1250, "battery": 88},
    "SCOOT-10": {"lat": 19.4370, "lng": -99.1260, "battery": 34},
    "SCOOT-11": {"lat": 19.4390, "lng": -99.1220, "battery": 99},
    "SCOOT-12": {"lat": 19.4360, "lng": -99.1270, "battery": 22},
    "SCOOT-13": {"lat": 19.4200, "lng": -99.1480, "battery": 67},
    "SCOOT-14": {"lat": 19.4210, "lng": -99.1460, "battery": 81},
    "SCOOT-15": {"lat": 19.4230, "lng": -99.1420, "battery": 49},
    "SCOOT-16": {"lat": 19.4250, "lng": -99.1400, "battery": 95},
    "SCOOT-17": {"lat": 19.4400, "lng": -99.1300, "battery": 60},
    "SCOOT-18": {"lat": 19.4410, "lng": -99.1310, "battery": 70},
    "SCOOT-19": {"lat": 19.4420, "lng": -99.1330, "battery": 41},
    "SCOOT-20": {"lat": 19.4390, "lng": -99.1350, "battery": 10}
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
