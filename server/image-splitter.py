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
import math

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
        
        # Determine split strategy: 2D grid if both dimensions exceed, else 1D strip
        exceeds_width = width > max_width
        exceeds_height = height > max_height
        
        if exceeds_width and exceeds_height:
            # Both dimensions exceed - use 2D grid splitting
            tile_width = max_width
            tile_height = max_height
            x_step = tile_width - overlap
            y_step = tile_height - overlap
            
            # Calculate number of tiles in each direction
            # Formula: 1 + ceil(max(0, dimension - tile_size) / step)
            num_cols = 1 + math.ceil(max(0, width - tile_width) / x_step)
            num_rows = 1 + math.ceil(max(0, height - tile_height) / y_step)
            
            tiles = []
            tile_index = 1
            
            for row in range(num_rows):
                y_offset = row * y_step
                # Tile height shrinks for last row if needed
                current_tile_height = min(tile_height, height - y_offset)
                
                for col in range(num_cols):
                    x_offset = col * x_step
                    # Tile width shrinks for last column if needed
                    current_tile_width = min(tile_width, width - x_offset)
                    
                    box = (
                        x_offset,
                        y_offset,
                        x_offset + current_tile_width,
                        y_offset + current_tile_height
                    )
                    
                    # Crop tile
                    tile = img.crop(box)
                    
                    # Convert to base64 PNG
                    buffer = io.BytesIO()
                    tile.save(buffer, format='PNG')
                    tile_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
                    
                    tiles.append({
                        'index': tile_index,
                        'data': tile_data,
                        'format': 'png',
                        'dimensions': [tile.width, tile.height],
                        'box': list(box),
                        'grid_position': [row, col]
                    })
                    tile_index += 1
            
            split_mode = 'grid'
            
        elif exceeds_height:
            # Only height exceeds - vertical strips (top to bottom)
            tile_width = width
            tile_height = max_height
            y_step = tile_height - overlap
            num_tiles = 1 + math.ceil(max(0, height - tile_height) / y_step)
            
            tiles = []
            
            for i in range(num_tiles):
                y_offset = i * y_step
                # Tile height shrinks for last tile if needed
                current_tile_height = min(tile_height, height - y_offset)
                box = (0, y_offset, tile_width, y_offset + current_tile_height)
                
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
            
            split_mode = 'vertical'
            
        else:
            # Only width exceeds - horizontal strips (left to right)
            tile_width = max_width
            tile_height = height
            x_step = tile_width - overlap
            num_tiles = 1 + math.ceil(max(0, width - tile_width) / x_step)
            
            tiles = []
            
            for i in range(num_tiles):
                x_offset = i * x_step
                # Tile width shrinks for last tile if needed
                current_tile_width = min(tile_width, width - x_offset)
                box = (x_offset, 0, x_offset + current_tile_width, tile_height)
                
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
            
            split_mode = 'horizontal'
        
        return {
            'success': True,
            'should_split': True,
            'original_dimensions': [width, height],
            'tiles': tiles,
            'tile_count': len(tiles),
            'split_mode': split_mode
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
