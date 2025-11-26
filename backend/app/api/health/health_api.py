"""
Health check API endpoints for AI Interview Platform Backend
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.logger import get_logger
from app.api.health.bucket import test_bucket_connection
from app.api.health.firestore import test_firestore_connection


logger = get_logger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


class HealthStatus(BaseModel):
    """Health status response model"""
    firestore: str
    storage: str


@router.get("/", response_model=HealthStatus)
async def health_check():
    """
    Health check endpoint that tests Firestore and Cloud Storage connectivity.
    
    Returns:
        HealthStatus: Status of firestore and storage services
    """
    logger.info("Health check requested")
    
    # Test Firestore connection
    firestore_healthy = test_firestore_connection()
    firestore_status = "healthy" if firestore_healthy else "unhealthy"
    
    # Test Cloud Storage bucket connection
    storage_healthy = test_bucket_connection()
    storage_status = "healthy" if storage_healthy else "unhealthy"
    
    logger.info(f"Health check result - Firestore: {firestore_status}, Storage: {storage_status}")
    
    # If either service is unhealthy, return 503 Service Unavailable
    if not (firestore_healthy and storage_healthy):
        raise HTTPException(
            status_code=503,
            detail={
                "firestore": firestore_status,
                "storage": storage_status
            }
        )
    
    return HealthStatus(
        firestore=firestore_status,
        storage=storage_status
    )


@router.get("/firestore", response_model=dict)
async def firestore_health():
    """
    Health check endpoint for Firestore only.
    
    Returns:
        dict: Status of firestore service
    """
    logger.info("Firestore health check requested")
    
    is_healthy = test_firestore_connection()
    status = "healthy" if is_healthy else "unhealthy"
    
    if not is_healthy:
        raise HTTPException(
            status_code=503,
            detail={"firestore": status}
        )
    
    return {"firestore": status}


@router.get("/storage", response_model=dict)
async def storage_health():
    """
    Health check endpoint for Cloud Storage only.
    
    Returns:
        dict: Status of storage service
    """
    logger.info("Storage health check requested")
    
    is_healthy = test_bucket_connection()
    status = "healthy" if is_healthy else "unhealthy"
    
    if not is_healthy:
        raise HTTPException(
            status_code=503,
            detail={"storage": status}
        )
    
    return {"storage": status}
