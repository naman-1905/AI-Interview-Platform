#!/usr/bin/env python3
"""
Test script to verify Google Cloud Storage bucket connection.
"""

import os
import sys
from google.cloud import storage
from google.api_core.exceptions import GoogleAPIError
from app.utils.logger import get_logger


logger = get_logger(__name__)


def test_bucket_connection():
    """Test the connection to the GCS bucket."""
    
    # Get configuration from environment variables
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./creds.json")
    
    if not bucket_name:
        logger.error("GCS_BUCKET_NAME is not set")
        return False
    
    logger.info("Testing bucket connection...")
    logger.info(f"Bucket: {bucket_name}")
    logger.info(f"Credentials: {creds_path}")
    
    # Check if credentials file exists
    if not os.path.exists(creds_path):
        logger.error(f"Credentials file not found at {creds_path}")
        return False
    
    try:
        # Initialize the storage client
        client = storage.Client()
        
        # Get the bucket
        bucket = client.bucket(bucket_name)
        
        # Check if bucket exists
        if client.get_bucket(bucket_name):
            logger.info(f"Successfully connected to bucket: {bucket_name}")
            
            # List first few objects in the bucket
            blobs = list(bucket.list_blobs(max_results=5))
            logger.info(f"Found {len(blobs)} objects (showing first 5):")
            for blob in blobs:
                logger.info(f"  - {blob.name}")
            
            return True
        else:
            logger.error(f"Bucket '{bucket_name}' does not exist")
            return False
            
    except GoogleAPIError as e:
        logger.error(f"Google API Error: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Connection Error: {str(e)}")
        return False



