export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  res.status(200).json({
    status: 'production-ready',
    version: '1.0.0',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    memory: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    endpoints: {
      health: '/api/health',
      quote: '/api/quote (GET)',
      greeting: '/api/greeting (POST)'
    },
    usage: {
      "quote": "GET /api/quote → <quote>\"text\"\n<author>Name",
      "greeting": 'POST /api/greeting {"greetingType": "morning", "history": []}'
    },
    timestamp: new Date().toISOString()
  });
}
