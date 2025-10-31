#!/usr/bin/env python3
"""
Image Splitter Service
Splits extreme-dimension images into multiple tiles for separate upload/processing
"""

import sys
import json
import os
from PIL import Image
import base64
import io

def split_image(image_path, config):
    """
    Split an extreme-dimension image into multiple tiles
    
    Args:
        image_path: Path to the input image
        config: Configuration dict with:
            - max_width: Maximum width before splitting (default: 2550)
            - max_height: Maximum height before splitting (default: 3300)
            - overlap: Pixel overlap between tiles (default: 100)
            - aspect_ratio_threshold: Aspect ratio triggering split (default: 5.0)
    
    Returns:
        JSON with:
            - should_split: bool
            - tiles: list of base64-encoded image data if split needed
            - tile_count: number of tiles
            - original_dimensions: [width, height]
    """
    try:
        # Load image
        img = Image.open(image_path)
        width, height = img.size
        
        # Get config
        max_width = config.get('max_width', 2550)
        max_height = config.get('max_height', 3300)
        overlap = config.get('overlap', 100)
        aspect_threshold = config.get('aspect_ratio_threshold', 5.0)
        
        # Check if splitting is needed
        aspect_ratio = max(width, height) / min(width, height)
        needs_split = (
            width > max_width or 
            height > max_height or 
            aspect_ratio > aspect_threshold
        )
        
        if not needs_split:
            return {
                'success': True,
                'should_split': False,
                'original_dimensions': [width, height],
                'tiles': [],
                'tile_count': 0
            }
        
        # Determine split direction (vertical or horizontal)
        split_vertically = height > width
        
        if split_vertically:
            # Split into horizontal strips (tall image)
            tile_width = width
            tile_height = max_height
            num_tiles = (height + tile_height - overlap - 1) // (tile_height - overlap)
        else:
            # Split into vertical strips (wide image)
            tile_width = max_width
            tile_height = height
            num_tiles = (width + tile_width - overlap - 1) // (tile_width - overlap)
        
        tiles = []
        
        for i in range(num_tiles):
            if split_vertically:
                # Vertical split (top to bottom)
                y_offset = i * (tile_height - overlap)
                # Last tile: adjust to fit remaining height
                if i == num_tiles - 1:
                    y_offset = height - tile_height
                    if y_offset < 0:
                        y_offset = 0
                        tile_height = height
                
                box = (0, y_offset, tile_width, min(y_offset + tile_height, height))
            else:
                # Horizontal split (left to right)
                x_offset = i * (tile_width - overlap)
                # Last tile: adjust to fit remaining width
                if i == num_tiles - 1:
                    x_offset = width - tile_width
                    if x_offset < 0:
                        x_offset = 0
                        tile_width = width
                
                box = (x_offset, 0, min(x_offset + tile_width, width), tile_height)
            
            # Crop tile
            tile = img.crop(box)
            
            # Convert to base64 PNG
            buffer = io.BytesIO()
            tile.save(buffer, format='PNG')
            tile_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            tiles.append({
                'index': i + 1,
                'data': tile_data,
                'format': 'png',
                'dimensions': [tile.width, tile.height],
                'box': list(box)
            })
        
        return {
            'success': True,
            'should_split': True,
            'original_dimensions': [width, height],
            'tiles': tiles,
            'tile_count': len(tiles),
            'split_direction': 'vertical' if split_vertically else 'horizontal'
        }
        
    except Exception as e:
        import traceback
        return {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Usage: python3 image-splitter.py <image_path> [config_json]'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    config = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    
    result = split_image(image_path, config)
    print(json.dumps(result))
