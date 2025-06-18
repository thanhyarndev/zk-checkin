#!/usr/bin/env python3
"""
Test script for RFID reader
This script will help diagnose if the RFID reader is working properly
"""

import time
import logging
from zk import connect_reader, start_inventory, RFIDTag

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_reader():
    """Test the RFID reader connection and tag detection"""
    
    logger.info("=== RFID Reader Test ===")
    
    # Test connection
    logger.info("1. Testing connection to RFID reader...")
    reader = connect_reader('COM1', 57600)
    
    if reader is None:
        logger.error("❌ FAILED: Could not connect to RFID reader on COM1")
        logger.info("Possible solutions:")
        logger.info("  - Check if the reader is connected to COM1")
        logger.info("  - Try different COM ports (COM2, COM3, etc.)")
        logger.info("  - Check if the reader drivers are installed")
        logger.info("  - Try different baud rates (9600, 115200, etc.)")
        return False
    
    logger.info("✅ SUCCESS: Connected to RFID reader")
    
    # Test tag detection
    logger.info("2. Testing tag detection...")
    logger.info("   Place an RFID tag near the reader within 30 seconds...")
    
    tag_detected = False
    tag_count = 0
    
    def on_tag(tag: RFIDTag):
        nonlocal tag_detected, tag_count
        tag_detected = True
        tag_count += 1
        logger.info(f"✅ Tag detected #{tag_count}: {tag}")
    
    # Start inventory for 30 seconds
    start_time = time.time()
    timeout = 30
    
    try:
        start_inventory(reader, address=0x00, tag_callback=on_tag)
        
        while time.time() - start_time < timeout:
            time.sleep(1)
            if tag_detected:
                break
        
        if tag_detected:
            logger.info(f"✅ SUCCESS: Detected {tag_count} tag(s) during test")
            return True
        else:
            logger.warning("⚠️  No tags detected during test")
            logger.info("Possible reasons:")
            logger.info("  - No RFID tags were placed near the reader")
            logger.info("  - Tags are not compatible with the reader")
            logger.info("  - Reader power or antenna settings need adjustment")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR during inventory: {e}")
        return False
    finally:
        if reader:
            reader.close()

if __name__ == "__main__":
    success = test_reader()
    if success:
        logger.info("🎉 RFID reader test completed successfully!")
    else:
        logger.error("💥 RFID reader test failed!")
        logger.info("Please check the error messages above and try again.") 