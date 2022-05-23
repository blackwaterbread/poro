import sharp from 'sharp';
import { Palette } from './types';

export function getPalette(data: Buffer, palEntries: number): Palette {
    const palette: Palette = [];
    for (let i = 0; i < palEntries; i++) {
        const p = i * 4;
        palette.push([data[p], data[p + 1], data[p + 2], data[p + 3]]);
    }
    return palette;
}

export function paletteMerge(palette: Palette, image: Buffer, bpp: number): Buffer {
    const result: number[] = []; // 256
    if (bpp === 4) {
        for (const p of image) {
            result.push(...palette[p >> 4]);
            result.push(...palette[p & 0x0F]);
        }
    }
    else {
        for (const p of image) {
            result.push(...palette[p]);
        }
    }
    return Buffer.from(result);
}

export function paletteSplit(image: Buffer, palEntries: number, bpp: number): Buffer {
    let colors: number[] = [];
    const paletteBuffer = Buffer.alloc(palEntries * 4);
    const imageBuffer: Buffer = Buffer.alloc(image.length / 4);
    
    if (palEntries) {
        if (bpp === 4) {
            // p >> 4
            // p & 0x0F
        }
        else if (bpp === 32) {
            return image;
        }
        else {
            for (let i = 0; i < image.length; i += 4) {
                const pixel = toUInt32(image[i], image[i + 1], image[i + 2], image[i + 3]);
                const pixelOffset = colors.indexOf(pixel);
                if (pixelOffset === -1) {
                    const newPixelOffset = colors.push(pixel);
                    imageBuffer.writeUInt8(newPixelOffset - 1, i / 4);
                }
                else {
                    imageBuffer.writeUInt8(pixelOffset, i / 4);
                }
            }
        }

        // palette size must be 256 bytes
        if (colors.length < 256)
            colors = colors.concat(new Array<number>(256 - colors.length).fill(0));

        // The original palette data are arranged. But it doesn't matter if skipped.
        for (const [i, v] of colors.entries())
            paletteBuffer.writeUInt32LE(v, i * 4);

        return Buffer.concat([paletteBuffer, imageBuffer]);
    }
    else {
        return image;
    }
}

export async function convertImageToRaw(buffer: Buffer) {
    const image = await sharp(buffer).ensureAlpha(0).raw();
    return image;
}

export async function convertRawToImage(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    const sImage = await sharp(buffer, {
        raw: {
            width: width,
            height: height,
            channels: 4,
        }
    })
    .png()
    .toBuffer();
    return sImage;
}

function toUInt32(u0: number, u1: number, u2: number, u3: number) {
    return Number(BigInt.asUintN(32, BigInt(u0 | u1 << 8 | u2 << 16 | u3 << 24)));
}