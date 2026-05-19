const mqtt = require('mqtt');
const { Kafka } = require('kafkajs');
const { Client } = require('pg');

// Conexiones utilizando el DNS interno de Kubernetes CoreDNS
const mqttClient = mqtt.connect('mqtt://emqx-service.data-pipeline.svc.cluster.local:1883');

const pgClient = new Client({
    host: 'postgres-service.data-pipeline.svc.cluster.local',
    database: 'ecoride_db',
    user: 'postgres',
    password: 'password123',
    port: 5432,
});

const kafka = new Kafka({
    clientId: 'ecoride-processor',
    brokers: ['kafka-service.data-pipeline.svc.cluster.local:9092']
});
const producer = kafka.producer();

async function initPipeline() {
    console.log("🔄 Inicializando Microservicio de Telemetría...");

    await pgClient.connect();
    console.log("✅ Conectado a PostgreSQL (Almacenamiento Relacional)");

    await producer.connect();
    console.log("✅ Conectado a Apache Kafka (Bus de Eventos)");

    // Suscribirse al canal de telemetría de los scooters
    mqttClient.subscribe('ecoride/scooters/+/telemetry', (err) => {
        if (!err) console.log("📡 Suscrito con éxito al Broker MQTT EMQX");
    });

    mqttClient.on('message', async (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            console.log(`📥 Evento IoT recibido en tema [${topic}]:`, payload);

            // 1. [MENSAJERÍA/EVENTOS] Publicar en Kafka para desacoplamiento distribuidos
            await producer.send({
                topic: 'scooter-events',
                messages: [{ value: JSON.stringify({ event: 'TELEMETRY_UPDATED', ...payload }) }],
            });

            // 2. [ALMACENAMIENTO] Persistencia asíncrona en PostgreSQL
            const query = 'INSERT INTO telemetry (scooter_id, latitude, longitude, battery) VALUES ($1, $2, $3, $4)';
            const values = [payload.scooterId, payload.lat, payload.lng, payload.battery];

            await pgClient.query(query, values);
            console.log(`💾 Telemetría del scooter ${payload.scooterId} persistida en la Base de Datos.`);

        } catch (error) {
            console.error('❌ Error procesando el evento de telemetría:', error.message);
        }
    });
}

initPipeline().catch(console.error);