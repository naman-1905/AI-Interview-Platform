"""
Main FastAPI application for AI Interview Platform Backend
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.utils.logger import get_logger
from app.api.health.health_api import router as health_router
from app.api.interview.api import router as interview_router
from app.api.user_details.user_api import router as user_router, start_cleanup_task
from app.api.user_details.status import router as status_router
from app.api.swot_details.swot_api import router as swot_router


logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Interview Platform Backend",
    description="Backend API for AI Interview Platform",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "https://aifrontend-1071940624586.asia-south2.run.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(user_router)
app.include_router(status_router)
app.include_router(interview_router)
app.include_router(swot_router)


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("Application starting up...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Log Level: {os.getenv('LOG_LEVEL', 'INFO')}")
    await start_cleanup_task()


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("Application shutting down...")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to AI Interview Platform Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", 8000))
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT", "development") == "development"
    )
