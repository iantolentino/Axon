#!/bin/bash

# Second Brain Deployment Script
set -e

echo "🚀 Starting Second Brain deployment..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Build Docker images
echo "📦 Building Docker images..."
docker-compose build

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down

# Start services
echo "✅ Starting services..."
docker-compose up -d

# Run database migrations (if any)
echo "🗄️ Running database setup..."
docker-compose exec web python -c "
from app import db, app
with app.app_context():
    db.create_all()
    print('Database setup completed')
"

# Health check
echo "🏥 Performing health check..."
sleep 10
curl -f http://localhost:5000/health || exit 1

echo "🎉 Deployment completed successfully!"
echo "📊 Your Second Brain is running at: http://localhost:5000"