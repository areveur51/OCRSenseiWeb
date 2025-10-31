#!/usr/bin/env python3
import sys
import json
import pytesseract
from PIL import Image
import os
import cv2
import numpy as np
import hashlib
from concurrent.futures import ThreadPoolExecutor
import tempfile

def get_image_hash(image_path):
    """Generate hash for image to use as cache key"""
    with open(image_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def get_cache_path(image_hash, preprocessing_config):
    """Get cache file path for preprocessed image"""
    cache_key = f"{image_hash}_{preprocessing_config}"
    cache_hash = hashlib.md5(cache_key.encode()).hexdigest()
    return os.path.join(tempfile.gettempdir(), f"ocr_cache_{cache_hash}.png")

def needs_chunking(width, height, max_chunk_width=2550, max_chunk_height=3300):
    """
    Determine if image needs to be chunked based on dimensions
    
    Letter size at 300 DPI = 2550x3300 pixels (8.5" x 11")
    Chunk if:
    - Either dimension exceeds chunk size
    - Aspect ratio > 5:1 (very narrow or very tall images)
    
    Args:
        width: Image width in pixels
        height: Image height in pixels
        max_chunk_width: Maximum chunk width (default: 2550)
        max_chunk_height: Maximum chunk height (default: 3300)
    
    Returns:
        Boolean indicating if chunking is needed
    """
    aspect_ratio = max(width / height, height / width) if min(width, height) > 0 else 1
    return (width > max_chunk_width or height > max_chunk_height or aspect_ratio > 5)

def create_image_chunks(image_path, chunk_width=2550, chunk_height=3300, overlap=100):
    """
    Split large image into overlapping letter-size chunks for OCR processing
    
    Args:
        image_path: Path to input image
        chunk_width: Width of each chunk (default: 2550 = 8.5" at 300 DPI)
        chunk_height: Height of each chunk (default: 3300 = 11" at 300 DPI)
        overlap: Overlap between chunks in pixels (default: 100)
    
    Returns:
        List of dicts with chunk info: {
            'image': PIL Image chunk,
            'x_offset': horizontal offset in original image,
            'y_offset': vertical offset in original image,
            'chunk_index': sequential chunk number
        }
    """
    try:
        img = Image.open(image_path)
        width, height = img.size
        
        chunks = []
        chunk_index = 0
        
        # Calculate step sizes (chunk size minus overlap)
        x_step = chunk_width - overlap
        y_step = chunk_height - overlap
        
        # Iterate through image creating overlapping chunks
        y = 0
        while y < height:
            x = 0
            while x < width:
                # Calculate chunk boundaries
                x_end = min(x + chunk_width, width)
                y_end = min(y + chunk_height, height)
                
                # Extract chunk
                chunk_img = img.crop((x, y, x_end, y_end))
                
                chunks.append({
                    'image': chunk_img,
                    'x_offset': x,
                    'y_offset': y,
                    'chunk_index': chunk_index,
                    'width': x_end - x,
                    'height': y_end - y
                })
                
                chunk_index += 1
                
                # Move to next column
                x += x_step
                if x >= width:
                    break
            
            # Move to next row
            y += y_step
            if y >= height:
                break
        
        print(f"Image chunking: {width}x{height} → {len(chunks)} chunks ({chunk_width}x{chunk_height} with {overlap}px overlap)", file=sys.stderr)
        
        return chunks
        
    except Exception as e:
        print(f"Chunking error: {str(e)}", file=sys.stderr)
        return []

def smart_resize_image(image_path, max_width=2000, max_height=3000):
    """
    Intelligently resize large images to optimal OCR dimensions
    
    Benefits:
    - 50-70% faster OCR processing on large images
    - Smaller storage footprint
    - Maintains quality for OCR (300 DPI optimal)
    
    Args:
        image_path: Path to input image
        max_width: Maximum width in pixels (default: 2000)
        max_height: Maximum height in pixels (default: 3000)
    
    Returns:
        Resized image path if resized, original path if already optimal
    """
    try:
        img = Image.open(image_path)
        width, height = img.size
        
        # Check if resizing is needed
        if width <= max_width and height <= max_height:
            # Image is already optimal size
            return image_path
        
        # Calculate scaling factor to fit within max dimensions while maintaining aspect ratio
        width_ratio = max_width / width if width > max_width else 1.0
        height_ratio = max_height / height if height > max_height else 1.0
        scale_factor = min(width_ratio, height_ratio)
        
        # Calculate new dimensions
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        
        # Resize using high-quality Lanczos resampling (best for downscaling)
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save to temporary file
        temp_path = os.path.join(tempfile.gettempdir(), f"ocr_resized_{os.path.basename(image_path)}")
        resized_img.save(temp_path, quality=95, optimize=True)
        
        original_size = os.path.getsize(image_path) / 1024 / 1024  # MB
        new_size = os.path.getsize(temp_path) / 1024 / 1024  # MB
        print(f"Smart resize: {width}x{height} ({original_size:.1f}MB) → {new_width}x{new_height} ({new_size:.1f}MB)", file=sys.stderr)
        
        return temp_path
        
    except Exception as e:
        print(f"Resize warning: {str(e)}, using original image", file=sys.stderr)
        return image_path

def preprocess_image(image_path, enable_preprocessing=True, enable_upscale=True, enable_denoise=True, enable_deskew=True, enable_cache=True):
    """
    Preprocess image for optimal OCR accuracy using OpenCV with caching
    
    Args:
        image_path: Path to input image
        enable_preprocessing: Master switch for all preprocessing
        enable_upscale: Upscale image for better small text recognition
        enable_denoise: Remove noise from image
        enable_deskew: Correct skew/rotation
        enable_cache: Enable preprocessing cache
    
    Returns:
        PIL Image ready for OCR
    """
    if not enable_preprocessing:
        return Image.open(image_path)
    
    try:
        cache_path = None
        
        # Check cache if enabled
        if enable_cache:
            image_hash = get_image_hash(image_path)
            preprocessing_config = f"{enable_upscale}_{enable_denoise}_{enable_deskew}"
            cache_path = get_cache_path(image_hash, preprocessing_config)
            
            if os.path.exists(cache_path):
                return Image.open(cache_path)
        
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
        
        # Convert to PIL Image
        processed_img = Image.fromarray(binary)
        
        # Save to cache if enabled
        if enable_cache and cache_path:
            try:
                processed_img.save(cache_path, 'PNG')
            except Exception as cache_error:
                print(f"Cache save warning: {str(cache_error)}", file=sys.stderr)
        
        return processed_img
        
    except Exception as e:
        # If preprocessing fails, fallback to original image
        print(f"Preprocessing warning: {str(e)}", file=sys.stderr)
        return Image.open(image_path)

def apply_performance_preset(cfg, preset):
    """
    Apply performance preset to configuration
    
    Presets:
    - fast: Minimal preprocessing, PSM 6 only, no upscale/denoise/deskew
    - balanced: Standard preprocessing with upscale, dual PSM (6 and 3)
    - accurate: Maximum preprocessing with upscale, denoise, deskew, dual PSM
    """
    if preset == 'fast':
        cfg['upscale'] = False
        cfg['denoise'] = False
        cfg['deskew'] = False
        cfg['psm2'] = cfg['psm1']  # Skip second pass by using same PSM
    elif preset == 'balanced':
        cfg['upscale'] = True
        cfg['denoise'] = False
        cfg['deskew'] = False
    elif preset == 'accurate':
        cfg['upscale'] = True
        cfg['denoise'] = True
        cfg['deskew'] = True
    return cfg

def run_tesseract_pass(img, config_str):
    """Run single Tesseract pass and return results"""
    data = pytesseract.image_to_data(img, config=config_str, output_type=pytesseract.Output.DICT)
    text = pytesseract.image_to_string(img, config=config_str)
    
    # Calculate average confidence
    conf_values = [int(conf) for conf in data['conf'] if conf != '-1' and int(conf) > 0]
    avg_conf = sum(conf_values) // len(conf_values) if conf_values else 0
    
    return {
        'data': data,
        'text': text,
        'confidence': avg_conf
    }

def process_single_chunk(chunk_img, cfg, x_offset=0, y_offset=0):
    """
    Process a single image chunk with dual-verification OCR
    
    Args:
        chunk_img: PIL Image to process
        cfg: Configuration dictionary
        x_offset: Horizontal offset in original image
        y_offset: Vertical offset in original image
    
    Returns:
        Dictionary with OCR results and adjusted bounding boxes (maintains dual verification)
    """
    temp_chunk_path = None
    try:
        # Save chunk to temp file for preprocessing
        temp_chunk_path = os.path.join(tempfile.gettempdir(), f"chunk_{x_offset}_{y_offset}_{os.getpid()}.png")
        chunk_img.save(temp_chunk_path)
        
        # Preprocess chunk (no smart resize needed - chunks are already letter-sized)
        processed_img = preprocess_image(
            temp_chunk_path,
            enable_preprocessing=cfg['preprocessing'],
            enable_upscale=cfg['upscale'],
            enable_denoise=cfg['denoise'],
            enable_deskew=cfg['deskew'],
            enable_cache=cfg['enableCache']
        )
        
        # Configuration strings
        config1_str = f'--oem {cfg["oem"]} --psm {cfg["psm1"]}'
        run_dual_pass = cfg['psm1'] != cfg['psm2']
        
        if run_dual_pass:
            # Dual verification: Run both passes concurrently
            config2_str = f'--oem {cfg["oem"]} --psm {cfg["psm2"]}'
            
            with ThreadPoolExecutor(max_workers=2) as executor:
                future1 = executor.submit(run_tesseract_pass, processed_img, config1_str)
                future2 = executor.submit(run_tesseract_pass, processed_img, config2_str)
                
                result1 = future1.result()
                result2 = future2.result()
            
            # Maintain dual verification data
            pytesseract_text = result1['text'].strip()
            pytesseract_conf = result1['confidence']
            easyocr_text = result2['text'].strip()
            easyocr_conf = result2['confidence']
            
            # Choose best result for bounding boxes
            if pytesseract_conf >= easyocr_conf:
                best_result = result1
                consensus_source = "pytesseract_config1"
                consensus_conf = pytesseract_conf
            else:
                best_result = result2
                consensus_source = "pytesseract_config2"
                consensus_conf = easyocr_conf
        else:
            # Fast mode: Single pass
            result1 = run_tesseract_pass(processed_img, config1_str)
            pytesseract_text = result1['text'].strip()
            pytesseract_conf = result1['confidence']
            easyocr_text = pytesseract_text
            easyocr_conf = pytesseract_conf
            best_result = result1
            consensus_source = "pytesseract_config1"
            consensus_conf = pytesseract_conf
        
        # Extract bounding boxes and adjust coordinates to global image position
        bounding_boxes = []
        n_boxes = len(best_result['data']['text'])
        for i in range(n_boxes):
            if int(best_result['data']['conf'][i]) > 0:
                box = {
                    'text': best_result['data']['text'][i],
                    'confidence': int(best_result['data']['conf'][i]),
                    'x': int(best_result['data']['left'][i]) + x_offset,
                    'y': int(best_result['data']['top'][i]) + y_offset,
                    'width': int(best_result['data']['width'][i]),
                    'height': int(best_result['data']['height'][i])
                }
                bounding_boxes.append(box)
        
        return {
            'pytesseract_text': pytesseract_text,
            'pytesseract_conf': pytesseract_conf,
            'easyocr_text': easyocr_text,
            'easyocr_conf': easyocr_conf,
            'consensus_conf': consensus_conf,
            'bounding_boxes': bounding_boxes,
            'source': consensus_source
        }
        
    except Exception as e:
        print(f"Chunk processing error at ({x_offset}, {y_offset}): {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            'pytesseract_text': '',
            'pytesseract_conf': 0,
            'easyocr_text': '',
            'easyocr_conf': 0,
            'consensus_conf': 0,
            'bounding_boxes': [],
            'source': 'error'
        }
    finally:
        # Always clean up temp file
        if temp_chunk_path and os.path.exists(temp_chunk_path):
            try:
                os.remove(temp_chunk_path)
            except Exception as cleanup_error:
                print(f"Failed to delete chunk temp file: {cleanup_error}", file=sys.stderr)

def merge_chunk_results(chunk_results):
    """
    Merge OCR results from multiple chunks while maintaining dual verification
    
    Args:
        chunk_results: List of chunk result dictionaries
    
    Returns:
        Merged result dictionary with dual verification maintained
    """
    # Combine results from all chunks
    pytesseract_parts = []
    easyocr_parts = []
    all_bboxes = []
    pytesseract_conf_sum = 0
    easyocr_conf_sum = 0
    consensus_conf_sum = 0
    valid_chunks = 0
    
    for chunk in chunk_results:
        # Only include chunks that produced text
        has_pytesseract = chunk.get('pytesseract_text', '').strip()
        has_easyocr = chunk.get('easyocr_text', '').strip()
        
        if has_pytesseract or has_easyocr:
            if has_pytesseract:
                pytesseract_parts.append(chunk['pytesseract_text'].strip())
            if has_easyocr:
                easyocr_parts.append(chunk['easyocr_text'].strip())
            
            # Extend bounding boxes
            all_bboxes.extend(chunk['bounding_boxes'])
            
            # Sum confidences
            pytesseract_conf_sum += chunk.get('pytesseract_conf', 0)
            easyocr_conf_sum += chunk.get('easyocr_conf', 0)
            consensus_conf_sum += chunk.get('consensus_conf', 0)
            valid_chunks += 1
    
    # Calculate average confidences
    avg_pytesseract_conf = pytesseract_conf_sum // valid_chunks if valid_chunks > 0 else 0
    avg_easyocr_conf = easyocr_conf_sum // valid_chunks if valid_chunks > 0 else 0
    avg_consensus_conf = consensus_conf_sum // valid_chunks if valid_chunks > 0 else 0
    
    # Combine text with newlines between chunks (preserves reading order)
    merged_pytesseract = '\n'.join(pytesseract_parts)
    merged_easyocr = '\n'.join(easyocr_parts)
    
    # Determine consensus between merged results
    if avg_pytesseract_conf >= avg_easyocr_conf:
        consensus_text = merged_pytesseract
        consensus_source = "pytesseract_config1"
    else:
        consensus_text = merged_easyocr
        consensus_source = "pytesseract_config2"
    
    return {
        'success': True,
        'pytesseract_text': merged_pytesseract,
        'pytesseract_confidence': avg_pytesseract_conf,
        'easyocr_text': merged_easyocr,
        'easyocr_confidence': avg_easyocr_conf,
        'consensus_text': consensus_text,
        'consensus_source': f'chunked_processing_{consensus_source}',
        'bounding_boxes': all_bboxes,
        'chunk_count': valid_chunks
    }

def process_image(image_path, config=None):
    """
    Process image with pytesseract using two different configurations for dual verification
    
    Automatically detects extreme dimensions and chunks large/narrow images into letter-size
    pieces for optimal OCR processing.
    
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
            - performancePreset: Performance preset (fast/balanced/accurate)
            - enableCache: Enable preprocessing cache (boolean)
    
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
            'deskew': True,
            'performancePreset': 'balanced',
            'enableCache': True,
            'maxWidth': 2000,  # Smart resize max width (pixels)
            'maxHeight': 3000  # Smart resize max height (pixels)
        }
        
        # Merge with provided config
        if config:
            default_config.update(config)
        
        cfg = default_config
        
        # Apply performance preset if specified
        if 'performancePreset' in cfg and cfg['performancePreset']:
            cfg = apply_performance_preset(cfg, cfg['performancePreset'])
        
        # Check original image dimensions before resizing
        orig_img = Image.open(image_path)
        orig_width, orig_height = orig_img.size
        orig_img.close()
        
        print(f"Original image dimensions: {orig_width}x{orig_height}", file=sys.stderr)
        
        # Check if chunking is needed for extreme dimensions
        if needs_chunking(orig_width, orig_height):
            # Process using chunking strategy
            print(f"Extreme dimensions detected ({orig_width}x{orig_height}), using chunking strategy", file=sys.stderr)
            
            chunks = create_image_chunks(image_path)
            if not chunks:
                # Fallback to normal processing if chunking fails
                print(f"Chunking failed, falling back to standard processing", file=sys.stderr)
            else:
                # Process each chunk
                chunk_results = []
                for chunk_info in chunks:
                    result = process_single_chunk(
                        chunk_info['image'],
                        cfg,
                        chunk_info['x_offset'],
                        chunk_info['y_offset']
                    )
                    chunk_results.append(result)
                
                # Merge results (maintains dual verification)
                merged = merge_chunk_results(chunk_results)
                
                # Return with all fields properly populated
                return {
                    'success': merged['success'],
                    'pytesseract_text': merged['pytesseract_text'],
                    'pytesseract_confidence': merged['pytesseract_confidence'],
                    'easyocr_text': merged['easyocr_text'],
                    'easyocr_confidence': merged['easyocr_confidence'],
                    'consensus_text': merged['consensus_text'],
                    'consensus_source': merged['consensus_source'],
                    'bounding_boxes': merged['bounding_boxes']
                }
        
        # Normal processing for standard-sized images
        # Smart resize image before processing (50-70% faster on large images)
        resized_path = smart_resize_image(
            image_path,
            max_width=cfg.get('maxWidth', 2000),
            max_height=cfg.get('maxHeight', 3000)
        )
        
        # Preprocess image (cached to avoid redundant operations)
        img = preprocess_image(
            resized_path,
            enable_preprocessing=cfg['preprocessing'],
            enable_upscale=cfg['upscale'],
            enable_denoise=cfg['denoise'],
            enable_deskew=cfg['deskew'],
            enable_cache=cfg['enableCache']
        )
        
        # Configuration strings
        config1_str = f'--oem {cfg["oem"]} --psm {cfg["psm1"]}'
        
        # Check if we should run dual pass or single pass (Fast mode)
        run_dual_pass = cfg['psm1'] != cfg['psm2']
        
        if run_dual_pass:
            # Run both passes concurrently for better performance
            config2_str = f'--oem {cfg["oem"]} --psm {cfg["psm2"]}'
            
            with ThreadPoolExecutor(max_workers=2) as executor:
                future1 = executor.submit(run_tesseract_pass, img, config1_str)
                future2 = executor.submit(run_tesseract_pass, img, config2_str)
                
                result1 = future1.result()
                result2 = future2.result()
            
            data1 = result1['data']
            text1 = result1['text']
            avg_conf1 = result1['confidence']
            
            data2 = result2['data']
            text2 = result2['text']
            avg_conf2 = result2['confidence']
        else:
            # Fast mode: Single pass only
            result1 = run_tesseract_pass(img, config1_str)
            
            data1 = result1['data']
            text1 = result1['text']
            avg_conf1 = result1['confidence']
            
            # Use same result for both to maintain consistent output format
            data2 = data1
            text2 = text1
            avg_conf2 = avg_conf1
        
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
