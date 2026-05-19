from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import stripe
import psycopg2

app = Flask(__name__)

# CORRECCIÓN: Permitir explícitamente cualquier origen y métodos para la demo
CORS(app, resources={r"/*": {"origins": "*"}})

# Stripe busca la clave secreta desde las variables de entorno de Docker
stripe.api_key = os.getenv('STRIPE_SECRET_KEY', 'sk_test_PLACEHOLDER')

def get_db_connection():
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user='ecoride',
        password='demo123',
        database='ecoride'
    )
    return conn

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'service': 'payment'})

@app.route('/api/payments/checkout', methods=['POST'])
def create_checkout_session():
    data = request.json or {}
    user_id = data.get('userId')
    amount = int(data.get('amount', 10))  # $10 USD por defecto
    
    try:
        # Crear la intención de pago en la nube de Stripe
        intent = stripe.PaymentIntent.create(
            amount=amount * 100,  # Stripe procesa en centavos (1000 = $10.00)
            currency='usd',
            payment_method_types=['card'],
            metadata={'user_id': user_id}
        )
        
        # Guardar registro local en PostgreSQL como simulación exitosa
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO payments (user_id, amount, status) VALUES (%s, %s, %s) RETURNING id',
            (user_id, amount, 'SUCCESS_TEST')
        )
        payment_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'clientSecret': intent.client_secret,
            'paymentId': payment_id,
            'status': 'IntentCreated'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)