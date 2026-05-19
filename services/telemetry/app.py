from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2
import time

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

def get_db_connection():
    import os
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user='ecoride',
        password='demo123',
        database='ecoride'
    )
    return conn

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'service': 'telemetry'})

@app.route('/api/telemetry/scooters', methods=['GET'])
def get_scooters_telemetry():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT id, battery_level, location_lat, location_lng, status FROM scooters')
        scooters = cur.fetchall()
        cur.close()
        conn.close()
        
        result = {
            'timestamp': time.time(),
            'scooters': [
                {
                    'id': s[0],
                    'battery': s[1],
                    'lat': s[2],
                    'lng': s[3],
                    'status': s[4]
                } for s in scooters
            ]
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=False)
