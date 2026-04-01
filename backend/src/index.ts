import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'vietjourney-api', version: '0.0.1' });
});

app.listen(PORT, () => {
  console.log(`[vietjourney-api] http://localhost:${PORT}`);
});
