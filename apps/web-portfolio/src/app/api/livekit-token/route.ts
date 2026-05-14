import { AccessToken } from 'livekit-server-sdk';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return Response.json(
      { error: 'LiveKit credentials not configured' },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const { roomId, identity, role } = await req.json();

  if (!roomId || !identity || !role) {
    return Response.json(
      { error: 'Missing roomId, identity, or role' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: 14400, // 4 hours
  });

  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: role === 'guest',
    canSubscribe: true,
    roomAdmin: role === 'admin',
  });

  const token = await at.toJwt();

  return Response.json({ token }, { headers: CORS_HEADERS });
}
