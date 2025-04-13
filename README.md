# 3 Words - A Personality Comparison Game

A clean, minimal web app that lets users and their friends describe each other with 3 words, then uses AI to analyze the comparison.

## Features

- Simple, clean design with an emotional tone
- Personalized user experience showing names
- AI-powered analysis using Google's Gemini API
- Animated reveal of comparison results
- Responsive design for all devices
- Completely client-side with localStorage for data persistence

## Getting Started

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your Gemini API key:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deploying to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2F3-words)

### Option 2: Manual Deployment

1. Push your code to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project" and import your repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: .next
5. Add Environment Variable:
   - Name: `NEXT_PUBLIC_GEMINI_API_KEY`
   - Value: Your Gemini API key
6. Deploy

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Your Google Gemini API key |

## App Structure

- `/` - Home page where users enter their name and 3 words
- `/invite/[userId]` - Page for inviting friends
- `/play/[id]` - Page for friends to enter their 3 words
- `/results/[id]` - Page showing AI analysis of the comparison

## Tech Stack

- Next.js with App Router
- React 
- CSS Modules
- Google Gemini API
- LocalStorage for data persistence
