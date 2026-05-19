# 1. Usamos la imagen oficial de Node de largo soporte sobre Alpine (ligera y segura)
FROM node:18-alpine

# 2. Definimos el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiamos los archivos de dependencias primero para aprovechar la caché de capas de Docker
COPY package*.json ./

# 4. Instalamos solo las dependencias de producción para mantener la imagen ligera
RUN npm install --production

# 5. Copiamos el resto del código fuente del microservicio
COPY . .

# 6. Exponemos el puerto de comunicación interna si fuera necesario (Node suele usar 3000 por defecto)
EXPOSE 3000

# 7. Comando de arranque que ejecuta tu telemetry-processor.js
CMD ["npm", "start"]