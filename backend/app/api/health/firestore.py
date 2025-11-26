

import os
import sys
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore as fb_firestore
from app.utils.logger import get_logger


logger = get_logger(__name__)


def test_firestore_connection():
    """Test the connection to Firestore database."""
    
    logger.info("Testing Firestore connection...")
    
    # Get Firestore credentials path
    creds_path = os.getenv('FIRESTORE_APPLICATION_CREDENTIALS')
    logger.info(f"Using Firestore credentials: {creds_path}")
    
    # Check if credentials file exists
    if not os.path.exists(creds_path):
        logger.error(f"Firestore credentials file not found at {creds_path}")
        return False
    
    try:
        # Initialize Firebase Admin SDK with Firestore credentials
        if not firebase_admin._apps:
            cred = credentials.Certificate(creds_path)
            firebase_admin.initialize_app(cred)
        
        # Get Firestore client
        db = fb_firestore.client()

        # Try a simple query
        logger.info("Attempting to list collections...")
        collections = list(db.collections())

        logger.info("Successfully connected to Firestore")
        logger.info(f"Found {len(collections)} collections:")

        for collection in collections[:5]:
            logger.info(f"  - {collection.id}")

        if len(collections) > 5:
            logger.info(f"... and {len(collections) - 5} more")

        return True

    except Exception as e:
        logger.error(f"Connection Error: {str(e)}")
        return False


