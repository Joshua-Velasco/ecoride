const express = require('express');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
app.use(express.json());

// ==========================================
// 1. CONFIGURACIÓN CLIENTE JWKS (Keycloak)
// ==========================================
// Define el endpoint interno del cluster de Kubernetes para obtener las llaves públicas
const KEYCLOAK_JWKS_URL = process.env.KEYCLOAK_JWKS_URL || 'http://keycloak:8080/realms/ecoride/protocol/openid-connect/certs';

const client = jwksClient({
  jwksUri: KEYCLOAK_JWKS_URL,
  cache: true,                  // Guarda en memoria las llaves para evitar pegarle a Keycloak en cada petición
  rateLimit: true,              // Previene ataques de denegación de servicio (DoS) a Keycloak
  jwksRequestsPerMinute: 10     // Máximo 10 peticiones de llaves por minuto
});

// Función callback requerida por jsonwebtoken para extraer la llave pública correcta según el ID (kid) del header del JWT
function getKey(header, callback) {
  if (!header || !header.kid) {
    return callback(new Error('El token JWT no contiene un ID de llave (kid) válido en su cabecera.'));
  }

  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      console.error('Error obteniendo la llave criptográfica desde Keycloak:', err.message);
      return callback(err);
    }
    const signingKey = key.getPublicKey() || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// ==========================================
// 2. ENDPOINTS DEL MICROSERVICIO
// ==========================================

// Endpoint de Salud (Esencial para los Probes Liveness/Readiness de Kubernetes)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'identity-service',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de Validación Agnóstica de Identidad
app.post('/api/identity/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      valid: false, 
      error: 'Falta token de autorización o el formato es incorrecto (Debe ser Bearer <token>)' 
    });
  }

  // Extrae únicamente la cadena de texto del JWT
  const token = authHeader.split(' ')[1];

  // Opciones de verificación estándar
  const verifyOptions = {
    audience: 'ecoride-app',        // Valida que el token pertenezca a tu cliente en Keycloak
    algorithms: ['RS256']          // Exige algoritmo de llave pública/privada robusto
  };

  // Validación asíncrona criptográfica del token emitido (Viene originalmente desde Google Auth)
  jwt.verify(token, getKey, verifyOptions, (err, decoded) => {
    if (err) {
      console.error('Fallo la verificación del JWT:', err.message);
      return res.status(403).json({ 
        valid: false, 
        error: 'Token inválido, manipulado o expirado.' 
      });
    }

    // Token legítimo y verificado. Retorna la información limpia del usuario para la malla de Kubernetes
    return res.json({
      valid: true,
      user_id: decoded.sub,        // ID único del usuario en Keycloak/Google
      email: decoded.email,
      name: decoded.name,
      preferred_username: decoded.preferred_username
    });
  });
});

// ==========================================
// 3. INICIALIZACIÓN DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`🚀 Identity Service (Node.js) corriendo en puerto: ${PORT}`);
  console.log(`🔒 Modo Zero-Trust: Validación agnóstica mediante firmas JWKS`);
  console.log(`================================================================`);
});