import os
from PIL import Image

def generate_icons():
    logo_path = os.path.join('public', 'EduSphere_Logo.png')
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found")
        return

    img = Image.open(logo_path).convert('RGBA')

    # Standard icons
    img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join('public', 'icon-192.png'), 'PNG', optimize=True)
    img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join('public', 'icon-512.png'), 'PNG', optimize=True)

    # Maskable icons with background padding
    bg_512 = Image.new('RGBA', (512, 512), (5, 8, 22, 255))
    logo_512 = img.resize((410, 410), Image.Resampling.LANCZOS)
    bg_512.paste(logo_512, (51, 51), logo_512)
    bg_512.save(os.path.join('public', 'icon-maskable-512.png'), 'PNG', optimize=True)

    bg_192 = Image.new('RGBA', (192, 192), (5, 8, 22, 255))
    logo_192 = img.resize((154, 154), Image.Resampling.LANCZOS)
    bg_192.paste(logo_192, (19, 19), logo_192)
    bg_192.save(os.path.join('public', 'icon-maskable-192.png'), 'PNG', optimize=True)

    # Apple touch icon & favicon
    img.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join('public', 'apple-touch-icon.png'), 'PNG', optimize=True)
    img.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join('public', 'favicon.png'), 'PNG', optimize=True)
    print("PWA icons generated successfully in public/ folder.")

if __name__ == '__main__':
    generate_icons()
