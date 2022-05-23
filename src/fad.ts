import fs from 'fs';
import path from 'path';
import * as ykcmp from './ykcmp';
import { convertRawToImage, convertImageToRaw, paletteMerge, getPalette, paletteSplit } from './image';
import { PresetCountByteOffset, HeaderFad, HeaderImage, InfoAnim, InfoImage } from './types';
import { getRemains, sum } from './utils';

const BYTE_COUNTS = 0x10;
const BYTE_IMG_OFFSET = 0x10;
const BYTE_HEADER = 0x20;
const BYTE_IMG_HEADER = 0x30;
const PREFIX_ANIM = 'anim';
const PREFIX_IMAGE = 'img';
const FORMAT_ANIM = 'dat';
const FORMAT_IMAGE = 'png';
const SPLIT_CHAR = '-';

export async function compress(filePath: string, preset: PresetCountByteOffset, outPath: string, outFile: string) {
    try {
        console.log(`compressing ${filePath} ...`);
        console.time('elapses');

        // parse some infos
        const animsInfo = parseAnimInfo(filePath);
        const imagesInfo = parseImageInfo(filePath);
        const anims1Count = animsInfo.filter(x => x.type === 1).length;
        const anims2Count = animsInfo.filter(x => x.type === 2).length;
        const imageCount = imagesInfo.length;

        // anim files data
        const animBuffers = animsInfo
            .sort((x, y) => x.index - y.index)
            .map(x => fs.readFileSync(x.path));

        // for image metadata
        const rawImages = await Promise.all(
            imagesInfo
                .sort((x, y) => x.index - y.index)
                .map(x => fs.readFileSync(x.path))
                .map(x => convertImageToRaw(x))
        );

        // with palette image data
        const imageDecBuffers = await Promise.all(
            rawImages.map(async (x, i) => {
                const { palEntries, bpp } = imagesInfo[i];
                const buffer = await x.toBuffer();
                const withPaletteImage = paletteSplit(buffer, palEntries, bpp);
                return withPaletteImage;
            }
        ));

        // compressed image data
        const imageCmpBuffers = imageDecBuffers.map((v, i) => imagesInfo[i].isRaw ? v : ykcmp.compress(v));

        // need fill some bytes
        const remainsAnim = animBuffers.map(x => getRemains(x.length));
        const remainsImage = imageCmpBuffers.map(x => getRemains(x.length));

        // constant bytes
        const bDummy = preset.dummy;

        // calculate estimated bytes
        const bFadHeader = BYTE_COUNTS + BYTE_IMG_OFFSET + bDummy;
        const bContentsHeader = BYTE_HEADER * (anims1Count + anims2Count + imageCount);
        const bAnimContents = sum(animBuffers.map(x => x.length));
        const bImgContents = (BYTE_IMG_HEADER * imageCount) + sum(imageCmpBuffers.map(x => x.length));
        const bRemains = sum(remainsAnim) + sum(remainsImage);
        const bTotalEstimated = (
            bFadHeader +
            bContentsHeader + // contents header bytes
            bAnimContents + // anims data bytes (header included)
            bImgContents + // image data bytes (header included)
            bRemains
        );

        console.log(`Estimated Size: ${bTotalEstimated} bytes`);

        const archiveBuffer = Buffer.alloc(bTotalEstimated);
        archiveBuffer.writeUInt32LE(anims1Count, preset.anims1);
        archiveBuffer.writeUInt32LE(anims2Count, preset.anims2);
        archiveBuffer.writeUInt32LE(imageCount, preset.images);
        archiveBuffer.writeUInt32LE(bTotalEstimated - bImgContents - sum(remainsImage), preset.imageStartOffset);

        let offsetP1 = bFadHeader;
        let offsetP2 = bFadHeader + bContentsHeader;
        for (const [i, v] of animsInfo.entries()) {
            const buffer = animBuffers[i];
            const cmpSize = buffer.length;
            const prevSize = i > 0 ? animBuffers[i - 1].length + remainsAnim[i - 1] : 0;
            const header = Buffer.alloc(BYTE_HEADER);

            offsetP2 += prevSize;
            header.set(v.name, 0x00);
            header.writeUInt32LE(cmpSize, 0x08);
            header.writeUInt32LE(v.type, 0x0C);
            header.writeUInt32LE(offsetP2, 0x10);

            archiveBuffer.set(header, offsetP1);
            archiveBuffer.set(buffer, offsetP2);
            offsetP1 += BYTE_HEADER;
            if (i === animsInfo.length - 1)
                offsetP2 += (cmpSize + remainsAnim[i]);
            console.log(`<-- in ${v.name} (size: ${cmpSize}, type: ${v.type})`);
        }

        for (const [i, v] of imagesInfo.entries()) {
            const { width, height } = await rawImages[i].metadata();
            const curImageBuffer = imageCmpBuffers[i];
            const cmpSize = curImageBuffer.length;
            const decSize = imageDecBuffers[i].length;

            // cmpSize + header (0x30) + remain bytes
            const sizeWithHeader = cmpSize + BYTE_IMG_HEADER + remainsImage[i];

            const prevSize = i > 0 ? imageCmpBuffers[i - 1].length + BYTE_IMG_HEADER + remainsImage[i - 1] : 0;
            offsetP2 += prevSize;

            const headerP1 = Buffer.alloc(BYTE_HEADER);
            const headerP2 = Buffer.alloc(BYTE_IMG_HEADER);

            headerP1.set(v.name, 0x00);
            headerP1.writeUInt32LE(sizeWithHeader, 0x08);
            headerP1.writeUInt32LE(offsetP2, 0x10);
            headerP1.writeUInt32LE(width!, 0x14);
            headerP1.writeUInt32LE(height!, 0x18);

            headerP2.set(v.name, 0x00); // * 0x00 8byte: name
            headerP2.writeUInt32LE(sizeWithHeader, 0x08);
            headerP2.writeUInt32LE(cmpSize, 0x10); // * 0x10 4byte: compressed size
            headerP2.writeUInt32LE(decSize, 0x14); // * 0x14 4byte: decompressed size
            headerP2.writeUInt16LE(width!, 0x18); // * 0x18 2byte: width
            headerP2.writeUInt16LE(height!, 0x1A); // * 0x1A 2byte: height
            headerP2.writeUInt16LE(v.palEntries, 0x1C); // * 0x1C 2byte: palette entries
            headerP2.writeUInt8(v.bpp, 0x1E); // * 0x1E 1byte: bit per pixel (bpp)
            headerP2.writeUInt8(0, 0x1F); // * 0x1F 1byte: isSwizzled

            archiveBuffer.set(headerP1, offsetP1);
            archiveBuffer.set(headerP2, offsetP2);
            archiveBuffer.set(curImageBuffer, offsetP2 + BYTE_IMG_HEADER);
            offsetP1 += BYTE_HEADER;

            console.log(
                `<-- in ${v.name} (dec-size: ${decSize}, cmp-size: ${cmpSize}, ` 
                + `width: ${width}, height: ${height}, bpp: ${v.bpp}, pal: ${v.palEntries})`
            );
        }

        if (!fs.existsSync(outPath))
            fs.mkdirSync(outPath, { recursive: true });

        fs.writeFileSync(`${outPath}/${outFile}`, archiveBuffer);
        console.log('successfully builded.');
    }
    catch (e: any) {
        console.error(e.message);
    }
    finally {
        console.timeEnd('elapses');
    }
}

export async function decompress(filePath: string, offsets: PresetCountByteOffset, outPath: string, outputRawData: boolean = false): Promise<void> {
    try {
        const buffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        console.log(`decompressing ${fileName} ...`);
        console.time('elapses');
        const { anims1, anims2, images, dummy } = offsets;
        const animCount = buffer.readInt32LE(anims1) + buffer.readInt32LE(anims2);
        const imageCount = buffer.readInt32LE(images);
        const headers = getHeaders(buffer, animCount + imageCount, dummy);
        const anims = headers.slice(0, animCount);
        const pics = headers.slice(animCount, animCount + imageCount);

        if (!fs.existsSync(outPath))
            fs.mkdirSync(outPath, { recursive: true });

        try {
            for (const [index, value] of anims.entries()) {
                const { offset, length, name, type } = value;
                const animOutput = buffer.slice(offset, offset + length);
                const animOutputName = `anim${SPLIT_CHAR}${index.toString().padStart(3, '0')}${SPLIT_CHAR}${name}${SPLIT_CHAR}${type}`;
                fs.writeFileSync(`${outPath}/${animOutputName}.dat`, animOutput);
                console.log(`--> out ${animOutputName} (size: ${length}, dec-size: ${animOutput.length}, type: ${type})`);
            }

            for (const [i, v] of pics.entries()) {
                const { offset, length, name } = v;
                const imgBuffer = buffer.slice(offset, offset + length);
                const header: HeaderImage = {
                    cmpSize: imgBuffer.readUInt32LE(0x10),
                    decSize: imgBuffer.readUInt32LE(0x14),
                    width: imgBuffer.readUInt16LE(0x18),
                    height: imgBuffer.readUInt16LE(0x1A),
                    palEntries: imgBuffer.readUInt16LE(0x1C),
                    bpp: imgBuffer.readUInt8(0x1E),
                    swizzled: imgBuffer.readUInt8(0x1F)
                }

                if (header.width === 0 || header.height === 0)
                    return;

                const rawBuffer = imgBuffer.slice(0x30);
                let flagRaw = header.cmpSize === header.decSize;
                let bufferImage = flagRaw ? rawBuffer : ykcmp.decompress(rawBuffer);
                let bufferMergedImage: Buffer;

                if (header.bpp === 32) {
                    bufferMergedImage = bufferImage;
                }
                else if (header.palEntries) {
                    const palette = getPalette(bufferImage, header.palEntries);
                    const image = bufferImage.slice(header.palEntries * 4); // 0x400 ~
                    bufferMergedImage = paletteMerge(palette, image, header.bpp);
                }

                const imageOutput = await convertRawToImage(bufferMergedImage!, header.width, header.height);
                const imageOutputName = `img${SPLIT_CHAR}${i.toString().padStart(3, '0')}` + 
                    `${SPLIT_CHAR}${name}${SPLIT_CHAR}${header.bpp}${SPLIT_CHAR}${header.palEntries}.${flagRaw ? 'raw' : 'ykcmp'}`;
                fs.writeFileSync(`${outPath}/${imageOutputName}.png`, imageOutput);

                if (outputRawData) {
                    fs.writeFileSync(`${outPath}/${imageOutputName}.raw`, bufferImage);
                    fs.writeFileSync(`${outPath}/${imageOutputName}.merged_raw`, bufferMergedImage!);
                }

                console.log(`--> out ${imageOutputName} (size: ${header.cmpSize}, dec-size: ${header.decSize}, `
                    +`width: ${header.width}, height: ${header.height}, bpp: ${header.bpp}, pal: ${header.palEntries})`
                );
            }
        }
        catch (e: any) {
            console.error(e.message);
        }
        finally {
            console.timeEnd('elapses');
        }
    }
    catch (e: any) {
        console.error(e.message);
    }
}

function getHeaders(buffer: Buffer, count: number, dummy: number = 0) {
    const output: HeaderFad[] = []
    for (let i = 0; i < count; i++) {
        const p = (i + 1) * 0x20 + dummy;
        const entry = buffer.slice(p, p + 0x20);
        // const name = entry.slice(0, 8).toString('ascii').replace(/\0/g, ''); // 8 byte, ASCII /x00 문자 공백으로 처리
        const name = entry.slice(0x00, 0x08).toString('hex');
        const length = entry.readUInt32LE(0x08);
        const type = entry.readUInt32LE(0x0C);
        const offset = entry.readUInt32LE(0x10);
        output.push({
            name: name,
            length: length,
            type: type,
            offset: offset
        });
    }
    return output;
}

export function getExtension(fileName: string) {
    const p = fileName.split('.');
    return p[p.length - 1];
}

export function parseAnimInfo(dirPath: string): InfoAnim[] {
    try {
        const files = fs.readdirSync(dirPath);
        const aFiles = files.filter(x => getExtension(x) === FORMAT_ANIM);
        const result: InfoAnim[] = aFiles.map(filename => {
            const inf = filename.split('.')[0].split(SPLIT_CHAR);
            if (inf[0] === PREFIX_ANIM) {
                return {
                    index: parseInt(inf[1]),
                    name: Buffer.from(inf[2], 'hex'),
                    type: parseInt(inf[3]),
                    path: `${dirPath}/${filename}`
                }
            }
            else {
                throw new Error();
            }
        });
        return result;
    }
    catch {
        throw new Error('Invalid anim format file name');
    }
}

export function parseImageInfo(dirPath: string): InfoImage[] {
    try {
        const files = fs.readdirSync(dirPath);
        const aFiles = files.filter(x => getExtension(x) === FORMAT_IMAGE);
        const result: InfoImage[] = aFiles.map(filename => {
            const sp1 = filename.split('.');
            const sp2 = sp1[0].split(SPLIT_CHAR);
            if (sp2[0] === PREFIX_IMAGE) {
                return {
                    index: parseInt(sp2[1]),
                    name: Buffer.from(sp2[2], 'hex'),
                    bpp: parseInt(sp2[3]),
                    palEntries: parseInt(sp2[4]),
                    isRaw: sp1[1] === 'raw',
                    path: `${dirPath}/${filename}`
                }
            }
            else {
                throw new Error();
            }
        });
        return result;
    }
    catch {
        throw new Error('Invalid anim format file name');
    }
}