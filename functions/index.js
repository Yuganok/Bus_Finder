import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { onRequest } from "firebase-functions/v2/https";

// Загружаем переменные окружения
dotenv.config();

// Создаем приложение Express
const app = express();

// Включаем CORS
const corsOptions = {
  origin: "*", // Разрешить запросы с любого источника
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Настраиваем подключение к базе данных
// Создаем пул подключений
const pool = mysql.createPool({
  host: "34.88.151.159", // Ваш публичный IP базы данных
  port: 3306, // Порт MySQL,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Максимальное количество соединений
  queueLimit: 0, // Без ограничения очереди
});

// Пример маршрута для проверки подключения
app.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 'Connection successful!' AS message");
    res.json(rows);
  } catch (err) {
    console.error("Ошибка подключения к базе данных:", err.message);
    res.status(500).send("Ошибка подключения к базе данных");
  }
});


// Получение списка регионов
app.get("/regions", async (req, res) => {
  const query = `SELECT DISTINCT stop_area FROM stops WHERE stop_area IS NOT NULL`;

  try {
    const [results] = await pool.query(query);
    res.json(results.map((row) => row.stop_area));
  } catch (err) {
    console.error("Ошибка выполнения запроса:", err.message);
    res.status(500).send("Ошибка сервера");
  }
});

app.get("/stops", async (req, res) => {
  const region = req.query.region;

  if (!region) {
    console.error("Регион не указан");
    return res.status(400).send("Регион не указан");
  }

  const query = `SELECT DISTINCT stop_name FROM stops WHERE stop_area = ?`;

  try {
    const [results] = await pool.query(query, [region]);
    res.json(results.map((row) => row.stop_name));
  } catch (err) {
    console.error("Ошибка выполнения запроса:", err.message);
    res.status(500).send("Ошибка сервера");
  }
});


app.get("/buses", async (req, res) => {
  const stopName = req.query.stop;
  const region = req.query.region;

  if (!stopName || !region) { 
      console.error("Остановка или регион не указаны");
      return res.status(400).send("Остановка или регион не указаны");
  }

  const query = `
      SELECT DISTINCT r.route_short_name AS bus_number
      FROM routes r
      JOIN trips t ON r.route_id = t.route_id
      WHERE t.trip_id IN (
          SELECT DISTINCT st.trip_id
          FROM stop_times st
          JOIN stops s ON st.stop_id = s.stop_id
          WHERE s.stop_name = ? AND s.stop_area = ? 
      )
      ORDER BY LENGTH(r.route_short_name), r.route_short_name;
  `;

  try {
      const [results] = await pool.query(query, [stopName, region]); 
      res.json(results.map((row) => row.bus_number));
  } catch (err) {
      console.error("Ошибка выполнения запроса:", err.message);
      res.status(500).send("Ошибка сервера");
  }
});




app.get("/nearest", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).send("Координаты не указаны");
  }

  const query = `
        SELECT stop_name, stop_area, 
               (6371 * acos(
                    cos(radians(?)) * cos(radians(stop_lat)) *
                    cos(radians(stop_lon) - radians(?)) +
                    sin(radians(?)) * sin(radians(stop_lat))
               )) AS distance
        FROM stops
        ORDER BY distance ASC
        LIMIT 1;
    `;

  try {
    const [results] = await pool.query(query, [lat, lon, lat]);

    if (results.length > 0) {
      res.json({
        stop: results[0].stop_name,
        region: results[0].stop_area,
      });
    } else {
      res.status(404).send("Ближайшая остановка не найдена");
    }
  } catch (err) {
    console.error("Ошибка выполнения запроса:", err.message);
    res.status(500).send("Ошибка сервера");
  }
});

// Маршрут для получения деталей автобуса
app.get("/bus-details", async (req, res) => {
  const { bus, stop } = req.query;

  if (!bus || !stop) {
    return res.status(400).send("Параметры bus и stop обязательны");
  }

  const query = `
    SELECT 
        st.arrival_time,
        t.trip_headsign,
        t.trip_long_name,
        r.route_long_name,
        s_next.stop_name as next_stop
    FROM stop_times st
    JOIN trips t ON st.trip_id = t.trip_id
    JOIN routes r ON t.route_id = r.route_id
    JOIN stop_times st_next ON st.trip_id = st_next.trip_id 
        AND st_next.stop_sequence = st.stop_sequence + 1
    JOIN stops s_next ON st_next.stop_id = s_next.stop_id
    WHERE r.route_short_name = ? 
        AND st.stop_id IN (SELECT stop_id FROM stops WHERE stop_name = ?)
    ORDER BY st.arrival_time ASC
    LIMIT 30;
  `;

  try {
    const [results] = await pool.query(query, [bus, stop]);

    if (results.length === 0) {
      return res.status(404).send("Данные не найдены");
    }

    res.json(results);
  } catch (err) {
    console.error("Ошибка выполнения запроса:", err.message);
    res.status(500).send("Ошибка сервера");
  }
});

export const api = onRequest(app);

