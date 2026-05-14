import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit credentials not configured' });
  }

  const { roomId, identity, role } = req.body ?? {};

  if (!roomId || !identity || !role) {
    return res.status(400).json({ error: 'Missing roomId, identity, or role' });
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
  return res.json({ token });
}
