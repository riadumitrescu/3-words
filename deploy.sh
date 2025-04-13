#!/bin/bash

# Simple deployment script for Vercel

echo "Starting deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Ensure environment variables are properly set
if [ ! -f .env.local ]; then
    echo "Warning: .env.local file not found. Make sure your environment variables are set in Vercel dashboard."
fi

# Build the project
echo "Building project..."
npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo "Deployment complete!" 