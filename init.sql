CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scooters (
  id SERIAL PRIMARY KEY,
  battery_level INTEGER,
  location_lat FLOAT,
  location_lng FLOAT,
  status VARCHAR(50),
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  scooter_id INTEGER NOT NULL REFERENCES scooters(id),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email) VALUES 
  ('user1', 'user1@ecoride.com'),
  ('user2', 'user2@ecoride.com'),
  ('user3', 'user3@ecoride.com')
ON CONFLICT DO NOTHING;

INSERT INTO scooters (battery_level, location_lat, location_lng, status) VALUES 
  (85, 19.4330, -99.1332, 'AVAILABLE'),
  (65, 19.4340, -99.1340, 'AVAILABLE'),
  (92, 19.4320, -99.1320, 'AVAILABLE'),
  (45, 19.4350, -99.1350, 'AVAILABLE')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS telemetry (
    id SERIAL PRIMARY KEY,
    scooter_id VARCHAR(50) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    battery INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);