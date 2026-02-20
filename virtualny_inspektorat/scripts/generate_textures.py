#!/usr/bin/env python3
"""Generate procedural VGA-style textures for Vapor Temple.

Uses only Python stdlib (struct, zlib) — no PIL/Pillow needed.
Outputs 64x64 tileable PNGs to assets/textures/.
"""
import struct, zlib, os, math, random

OUTDIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'textures')
SIZE = 64


def write_png(filename, width, height, pixels):
    """Write RGB pixel data as a PNG file.
    pixels: list of (r, g, b) tuples, row-major, top-to-bottom.
    """
    def chunk(ctype, data):
        c = ctype + data
        crc = zlib.crc32(c) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter: None
        for x in range(width):
            r, g, b = pixels[y * width + x]
            raw += struct.pack('BBB', clamp(r), clamp(g), clamp(b))

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(sig + ihdr + idat + iend)
    print(f'  wrote {filename} ({os.path.getsize(filename)} bytes)')


def clamp(v):
    return max(0, min(255, int(v)))


# ── Perlin noise ──

def make_perlin(seed=42):
    rng = random.Random(seed)
    perm = list(range(256))
    rng.shuffle(perm)
    perm = perm + perm

    def fade(t):
        return t * t * t * (t * (t * 6 - 15) + 10)

    def lerp(a, b, t):
        return a + t * (b - a)

    def grad(h, x, y):
        h = h & 3
        u = x if h < 2 else y
        v = y if h < 2 else x
        return (u if h & 1 == 0 else -u) + (v if h & 2 == 0 else -v)

    def noise(x, y):
        X = int(math.floor(x)) & 255
        Y = int(math.floor(y)) & 255
        x -= math.floor(x)
        y -= math.floor(y)
        u, v = fade(x), fade(y)
        A = perm[X] + Y
        B = perm[X + 1] + Y
        return lerp(
            lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
            lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
            v
        )

    def turbulence(x, y, octaves=4):
        val = 0.0
        freq = 1.0
        amp = 1.0
        for _ in range(octaves):
            val += abs(noise(x * freq, y * freq)) * amp
            freq *= 2
            amp *= 0.5
        return val

    return noise, turbulence


# ── Texture generators ──

def generate_sky():
    """Blue sky with blocky VGA-style clouds."""
    print('Generating sky.png...')
    noise, turb = make_perlin(seed=123)
    pixels = []

    for y in range(SIZE):
        for x in range(SIZE):
            t = y / (SIZE - 1)  # 0 at top, 1 at bottom

            # Sky gradient: deep blue → lighter blue
            base_r = 30 + t * 50
            base_g = 50 + t * 100
            base_b = 140 + t * 80

            # Cloud layer using tileable noise (wrap coordinates)
            nx = x / 12.0
            ny = y / 14.0
            # Make tileable by using modular coordinates
            cloud = (
                noise(nx, ny)
                + 0.5 * noise(nx * 2.1, ny * 2.1)
                + 0.25 * noise(nx * 4.3, ny * 4.3)
            )

            # Threshold and shape clouds — stronger in upper-middle area
            vert_mask = math.sin(t * math.pi) ** 0.5  # peaks in middle
            cloud = max(0, cloud * 1.8 - 0.15) * vert_mask
            cloud = min(1.0, cloud)

            # Quantize to 6 levels for VGA look
            cloud = int(cloud * 5) / 5.0

            # Blend cloud white into sky blue
            r = base_r + cloud * (220 - base_r)
            g = base_g + cloud * (225 - base_g)
            b = base_b + cloud * (240 - base_b)

            # Final color quantization to ~32 levels per channel
            r = int(r / 8) * 8
            g = int(g / 8) * 8
            b = int(b / 8) * 8

            pixels.append((r, g, b))

    write_png(os.path.join(OUTDIR, 'sky.png'), SIZE, SIZE, pixels)


def generate_marble():
    """Dark marble with veining, VGA-style."""
    print('Generating marble.png...')
    noise, turb = make_perlin(seed=77)
    pixels = []

    for y in range(SIZE):
        for x in range(SIZE):
            # Tileable marble veining: sin(x_freq + turbulence)
            nx = x / SIZE
            ny = y / SIZE

            t_val = turb(nx * 4, ny * 4)
            vein = math.sin(nx * 8 * math.pi + t_val * 4)
            vein = (vein + 1) / 2  # normalize 0-1

            # Secondary finer veining
            vein2 = math.sin(ny * 12 * math.pi + turb(nx * 6 + 10, ny * 6 + 10) * 3)
            vein2 = (vein2 + 1) / 2

            # Combine
            v = vein * 0.7 + vein2 * 0.3

            # Quantize to 8 levels for VGA chunky look
            v = int(v * 7) / 7.0

            # Dark purple marble palette
            # Base: deep purple (#1a0a2e ≈ 26, 10, 46)
            # Veins: lighter purple-pink (#6a3a8a ≈ 106, 58, 138)
            r = int(26 + v * 90)
            g = int(10 + v * 50)
            b = int(46 + v * 100)

            # Extra color quantization
            r = int(r / 6) * 6
            g = int(g / 6) * 6
            b = int(b / 6) * 6

            pixels.append((r, g, b))

    write_png(os.path.join(OUTDIR, 'marble.png'), SIZE, SIZE, pixels)


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    generate_sky()
    generate_marble()
    print('Done!')
