"""
Logger configuration for AI Interview Platform Backend
"""

import logging
import os
from logging.handlers import RotatingFileHandler


def get_logger(name: str) -> logging.Logger:
    """
    Create and configure a logger instance.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured logger instance
    """
    log_level = os.getenv("LOG_LEVEL", "INFO")
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level))
    
    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level))
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    # File handler (optional - uncomment if you want file logging)
    # log_file = os.getenv("LOG_FILE", "app.log")
    # file_handler = RotatingFileHandler(
    #     log_file, maxBytes=10485760, backupCount=5  # 10MB per file, keep 5 backups
    # )
    # file_handler.setLevel(getattr(logging, log_level))
    # file_handler.setFormatter(formatter)
    # logger.addHandler(file_handler)
    
    logger.addHandler(console_handler)
    
    return logger
