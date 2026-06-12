export default async (req, context) => {
  const FD_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

  const res = await fetch(FD_URL, {
    headers: {
      'X-Auth-Token': process.env.VITE_FOOTBALL_DATA_TOKEN,
    },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `HTTP ${res.status}` }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await res.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/matches' };
