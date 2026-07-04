from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    # Neo-brutalist blue #0055ff
    img = Image.new('RGB', (size, size), color='#0055ff')
    d = ImageDraw.Draw(img)
    
    # Draw a 5px black border
    border_width = max(2, size // 40)
    d.rectangle([0, 0, size-1, size-1], outline='black', width=border_width)
    
    # We will just draw a simple "F" using polygons or lines to avoid font dependencies
    margin = size // 4
    thickness = size // 8
    
    # Vertical line of F
    d.rectangle([margin, margin, margin + thickness, size - margin], fill='white', outline='black', width=max(1, border_width//2))
    # Top horizontal line
    d.rectangle([margin, margin, size - margin, margin + thickness], fill='white', outline='black', width=max(1, border_width//2))
    # Middle horizontal line
    d.rectangle([margin, size // 2 - thickness // 2, size - margin - thickness, size // 2 + thickness // 2], fill='white', outline='black', width=max(1, border_width//2))

    img.save(f"public/icons/icon-{size}x{size}.png")
    print(f"Created icon-{size}x{size}.png")

if __name__ == "__main__":
    os.makedirs("public/icons", exist_ok=True)
    create_icon(192)
    create_icon(512)
    print("Icons generated.")
