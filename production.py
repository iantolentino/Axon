# production.py - Windows production server
from app import app
from waitress import serve
import os

if __name__ == '__main__':
    # Production configuration
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    
    print(f"🚀 Starting Second Brain production server on {host}:{port}")
    print("📊 Access your app at: http://localhost:5000")
    print("🛑 Press Ctrl+C to stop the server")
    
    # Serve with Waitress (production-ready for Windows)
    serve(app, host=host, port=port, threads=4)