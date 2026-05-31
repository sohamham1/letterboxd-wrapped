import logging
import sys
from datetime import datetime

def setup_logger(name="letterboxd_wrapped"):
    """
    Set up a structured logger with stdout output (Vercel-compatible).
    Vercel automatically captures stdout/stderr.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)  # Set to INFO for production
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Single StreamHandler for stdout - Vercel captures this automatically
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    
    # Structured format with timestamp
    formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    
    return logger

# Create default logger instance
logger = setup_logger()

def log_section(title):
    """Log a section separator for better readability"""
    logger.info("=" * 60)
    logger.info(title)
    logger.info("=" * 60)

def log_stats(stats_dict, title="Statistics"):
    """Log a dictionary of statistics in a formatted way"""
    logger.info(f"\n{title}:")
    for key, value in stats_dict.items():
        logger.info(f"  {key}: {value}")
