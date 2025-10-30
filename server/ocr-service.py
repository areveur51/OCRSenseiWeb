#!/usr/bin/env python3
import sys
import json
import pytesseract
from PIL import Image
import os

def process_image(image_path):
    """
    Process image with pytesseract using two different configurations for dual verification
    Returns JSON with both results and consensus
    """
    try:
        img = Image.open(image_path)
        
        # Configuration 1: Standard OCR with detailed data
        config1 = r'--oem 3 --psm 6'
        data1 = pytesseract.image_to_data(img, config=config1, output_type=pytesseract.Output.DICT)
        text1 = pytesseract.image_to_string(img, config=config1)
        
        # Configuration 2: More aggressive preprocessing
        config2 = r'--oem 3 --psm 3'
        data2 = pytesseract.image_to_data(img, config=config2, output_type=pytesseract.Output.DICT)
        text2 = pytesseract.image_to_string(img, config=config2)
        
        # Calculate average confidence for each configuration
        conf1_values = [int(conf) for conf in data1['conf'] if conf != '-1']
        conf2_values = [int(conf) for conf in data2['conf'] if conf != '-1']
        
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
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': 'Usage: ocr-service.py <image_path>'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({'success': False, 'error': f'File not found: {image_path}'}))
        sys.exit(1)
    
    result = process_image(image_path)
    print(json.dumps(result))
