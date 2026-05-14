import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local from monorepo root
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/livekit-token', async (req, res) => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    res.status(500).json({ error: 'LIVEKIT_API_KEY / LIVEKIT_API_SECRET no configurados' });
    return;
  }

  const { roomId, identity, role } = req.body ?? {};

  if (!roomId || !identity || !role) {
    res.status(400).json({ error: 'Faltan roomId, identity o role' });
    return;
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: 14400,
  });

  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: role === 'guest',
    canSubscribe: true,
    roomAdmin: role === 'admin',
  });

  const token = await at.toJwt();
  res.json({ token });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`Token server corriendo en http://localhost:${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/api/livekit-token`);
});
