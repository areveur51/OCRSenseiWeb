#!/usr/bin/env python3
import sys
import json
import pytesseract
from PIL import Image
import os
import cv2
import numpy as np

def preprocess_image(image_path, enable_preprocessing=True, enable_upscale=True, enable_denoise=True, enable_deskew=True):
    """
    Preprocess image for optimal OCR accuracy using OpenCV
    
    Args:
        image_path: Path to input image
        enable_preprocessing: Master switch for all preprocessing
        enable_upscale: Upscale image for better small text recognition
        enable_denoise: Remove noise from image
        enable_deskew: Correct skew/rotation
    
    Returns:
        PIL Image ready for OCR
    """
    if not enable_preprocessing:
        return Image.open(image_path)
    
    try:
        # Read image with OpenCV
        img = cv2.imread(image_path)
        
        if img is None:
            # Fallback to PIL if OpenCV can't read the image
            return Image.open(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Upscale if enabled (helps with small text)
        if enable_upscale:
            gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        
        # Denoise if enabled
        if enable_denoise:
            gray = cv2.medianBlur(gray, 3)
        
        # Binarization using Otsu's method (converts to black and white)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Deskew if enabled (correct rotation)
        if enable_deskew:
            coords = np.column_stack(np.where(binary > 0))
            if len(coords) > 0:
                angle = cv2.minAreaRect(coords)[-1]
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                
                # Only deskew if angle is significant
                if abs(angle) > 0.5:
                    (h, w) = binary.shape[:2]
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    binary = cv2.warpAffine(binary, M, (w, h), 
                                           flags=cv2.INTER_CUBIC, 
                                           borderMode=cv2.BORDER_REPLICATE)
        
        # Convert back to PIL Image
        return Image.fromarray(binary)
        
    except Exception as e:
        # If preprocessing fails, fallback to original image
        print(f"Preprocessing warning: {str(e)}", file=sys.stderr)
        return Image.open(image_path)

def process_image(image_path, config=None):
    """
    Process image with pytesseract using two different configurations for dual verification
    
    Args:
        image_path: Path to input image
        config: Dictionary with OCR configuration:
            - oem: OCR Engine Mode (0=Legacy, 1=LSTM, 2=Legacy+LSTM, 3=Default)
            - psm1: Page Segmentation Mode for config 1
            - psm2: Page Segmentation Mode for config 2
            - preprocessing: Enable preprocessing (boolean)
            - upscale: Enable upscaling (boolean)
            - denoise: Enable denoising (boolean)
            - deskew: Enable deskewing (boolean)
    
    Returns JSON with both results and consensus
    """
    try:
        # Default configuration
        default_config = {
            'oem': 1,  # LSTM only (recommended for documents)
            'psm1': 6,  # Single uniform text block
            'psm2': 3,  # Fully automatic page segmentation
            'preprocessing': True,
            'upscale': True,
            'denoise': True,
            'deskew': True
        }
        
        # Merge with provided config
        if config:
            default_config.update(config)
        
        cfg = default_config
        
        # Preprocess image
        img = preprocess_image(
            image_path,
            enable_preprocessing=cfg['preprocessing'],
            enable_upscale=cfg['upscale'],
            enable_denoise=cfg['denoise'],
            enable_deskew=cfg['deskew']
        )
        
        # Configuration 1: Using first PSM mode
        config1 = f'--oem {cfg["oem"]} --psm {cfg["psm1"]}'
        data1 = pytesseract.image_to_data(img, config=config1, output_type=pytesseract.Output.DICT)
        text1 = pytesseract.image_to_string(img, config=config1)
        
        # Configuration 2: Using second PSM mode
        config2 = f'--oem {cfg["oem"]} --psm {cfg["psm2"]}'
        data2 = pytesseract.image_to_data(img, config=config2, output_type=pytesseract.Output.DICT)
        text2 = pytesseract.image_to_string(img, config=config2)
        
        # Calculate average confidence for each configuration
        conf1_values = [int(conf) for conf in data1['conf'] if conf != '-1' and int(conf) > 0]
        conf2_values = [int(conf) for conf in data2['conf'] if conf != '-1' and int(conf) > 0]
        
        avg_conf1 = sum(conf1_values) // len(conf1_values) if conf1_values else 0
        avg_conf2 = sum(conf2_values) // len(conf2_values) if conf2_values else 0
        
        # Determine consensus (higher confidence wins)
        if avg_conf1 >= avg_conf2:
            consensus_text = text1
            consensus_source = "pytesseract_config1"
            consensus_conf = avg_conf1
            best_data = data1
        else:
            consensus_text = text2
            consensus_source = "pytesseract_config2"
            consensus_conf = avg_conf2
            best_data = data2
        
        # Extract bounding boxes from best result
        bounding_boxes = []
        n_boxes = len(best_data['text'])
        for i in range(n_boxes):
            if int(best_data['conf'][i]) > 0:
                box = {
                    'text': best_data['text'][i],
                    'confidence': int(best_data['conf'][i]),
                    'x': int(best_data['left'][i]),
                    'y': int(best_data['top'][i]),
                    'width': int(best_data['width'][i]),
                    'height': int(best_data['height'][i])
                }
                bounding_boxes.append(box)
        
        result = {
            'success': True,
            'pytesseract_text': text1.strip(),
            'pytesseract_confidence': avg_conf1,
            'easyocr_text': text2.strip(),
            'easyocr_confidence': avg_conf2,
            'consensus_text': consensus_text.strip(),
            'consensus_source': consensus_source,
            'bounding_boxes': bounding_boxes
        }
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Usage: ocr-service.py <image_path> [config_json]'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({'success': False, 'error': f'File not found: {image_path}'}))
        sys.exit(1)
    
    # Parse config if provided
    config = None
    if len(sys.argv) >= 3:
        try:
            config = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            print(json.dumps({'success': False, 'error': 'Invalid JSON configuration'}))
            sys.exit(1)
    
    result = process_image(image_path, config)
    print(json.dumps(result))
