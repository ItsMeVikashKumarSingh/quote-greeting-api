# Quote & Greeting API

A serverless API built with Vercel Functions and Google Gemini AI that provides two intelligent endpoints: random quote generation in a custom text format and context-aware greeting generation with history tracking to avoid repetition.

---

## Features

* Quote generator returning inspirational quotes in a custom plain-text format
* Smart greeting generator that avoids repetition using client-provided history
* Serverless architecture using Vercel Node.js runtime
* AI-powered text generation using Google Gemini 2.0 Flash
* CORS enabled for easy frontend integration

---

## API Endpoints

### 1. Generate Quote

**Endpoint**

* `GET /api/generate-quote`
* `POST /api/generate-quote`

**Response Format**

```
<quote>"Don't cry because it's over, smile because it happened."
<author>Dr. Seuss
```

**cURL Example**

```bash
curl https://your-app.vercel.app/api/generate-quote
```

---

### 2. Generate Greeting (with History)

**Endpoint**

* `POST /api/generate-greeting`

**Request Body**

```json
{
  "greetingType": "morning",
  "history": [
    "Good Morning! Hope you slept well",
    "Rise and shine! Have a great day"
  ]
}
```

**Parameters**

* `greetingType` (optional): `morning`, `afternoon`, `evening`, `night`
  Default: `morning`
* `history` (optional): Array of previously generated greetings to avoid repetition

**Response**

```json
{
  "greeting": "Hey there! Wishing you a fantastic start filled with positive vibes!",
  "greetingType": "morning",
  "timestamp": "2026-01-06T05:45:00.000Z"
}
```

**cURL Example**

```bash
curl -X POST https://your-app.vercel.app/api/generate-greeting \
  -H "Content-Type: application/json" \
  -d '{"greetingType": "evening", "history": ["Good Evening! Hope your day was great"]}'
```

---

## Project Structure

```
quote-greeting-api/
├── api/
│   ├── generate-quote.js      # Quote generation endpoint
│   └── generate-greeting.js   # Greeting generation with history
├── package.json               # Dependencies
├── vercel.json                # Vercel configuration
└── README.md                  # Documentation
```

---

## Deployment

### Prerequisites

* GitHub account
* Vercel account (free tier supported)
* Google Gemini API key

### Deploy to Vercel

1. Clone the repository

```bash
git clone https://github.com/ItsMeVikashKumarSingh/quote-greeting-api.git
cd quote-greeting-api
```

2. Deploy on Vercel

* Go to [https://vercel.com](https://vercel.com)
* Click **Add New Project**
* Import this GitHub repository
* Click **Deploy**

3. Configure environment variables

* Go to **Project Settings → Environment Variables**
* Add:

```
GEMINI_API_KEY=your_gemini_api_key
```

* Apply to Production, Preview, and Development
* Redeploy the project

---

## Local Development

```bash
npm install

export GEMINI_API_KEY="your_api_key_here"

npm i -g vercel
vercel dev
```

---

## Technology Stack

* Runtime: Node.js (Vercel Serverless Functions)
* AI Model: Google Gemini 2.0 Flash Experimental
* Deployment: Vercel
* Language: JavaScript (ES Modules)

---

## Configuration

### Temperature Settings

* Quote generation: 0.9
* Greeting generation: 1.3

### Rate Limits

* Vercel Free Tier: 100 GB bandwidth per month
* Gemini API Free Tier: 15 requests per minute

---

## Performance

* Cold start: ~200–500 ms
* Warm start: ~100–300 ms
* AI generation: ~500–2000 ms

---

## Error Handling

* Quote endpoint returns a default quote on failure
* Greeting endpoint returns a generic greeting on failure
* Errors are logged for debugging

---

## Use Cases

* Daily motivational quote services
* Chatbots with dynamic greetings
* Browser extensions
* Wellness and productivity applications

---

## License

MIT License

---

## Author

**Vikash Kumar Singh**

GitHub: [https://github.com/ItsMeVikashKumarSingh](https://github.com/ItsMeVikashKumarSingh)
Repository: [https://github.com/ItsMeVikashKumarSingh/quote-greeting-api](https://github.com/ItsMeVikashKumarSingh/quote-greeting-api)

---

## Support

For issues or feature requests, open an issue here:
[https://github.com/ItsMeVikashKumarSingh/quote-greeting-api/issues](https://github.com/ItsMeVikashKumarSingh/quote-greeting-api/issues)

Live Demo: [https://your-app.vercel.app](https://your-app.vercel.app)
