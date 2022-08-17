import fs from 'fs';
import path from 'path';
import { PRESETS, HeaderScript, OutputScript, MergedScript } from './types';
import { sum } from './utils';

function getHeaders(preset: PRESETS, buffer: Buffer): HeaderScript[] {
    const headers: HeaderScript[] = [];
    const count = buffer.readUInt32LE(0x00);
    const dummy = preset === 'na' ? 0x00 : 0x04;
    const length = 0x0C + dummy;
    for (let i = 0x04; i < count * length; i += length) {
        const id = buffer.readUInt32LE(i);
        const length = buffer.readUInt32LE(i + 0x04);
        const offset = buffer.readUInt32LE(i + 0x08) + 0x04;
        headers.push({
            id: id,
            length: length,
            offset: offset
        });
    }
    return headers;
}

export function compress(filePath: string, preset: PRESETS, outPath: string, fileName: string) {
    const script = JSON.parse(fs.readFileSync(filePath).toString()) as OutputScript;
    const dummy = preset === 'na' ? 0x00 : 0x04;
    const textBuffers = script.map(v => Buffer.from(v.text, 'utf8'));
    try {
        console.time('elapses');
        const bHeader = (script.length * 0x10) + 0x04;
        const bScripts = sum(textBuffers.map(x => x.length)) + (script.length * 0x02);
        const bTotalEstimated = bHeader + bScripts;

        const buffer = Buffer.alloc(bTotalEstimated);
        buffer.writeUInt32LE(script.length, 0x00);
        let hOffset = 0x04;
        let dOffset = bHeader + 0x01;
        for (const [i, v] of script.entries()) {
            buffer.writeUInt32LE(v.id, hOffset); // 0x00, id
            buffer.writeUInt32LE(v.text.length, hOffset + 0x04); // 0x04, text length
            buffer.writeUInt32LE(dOffset - 0x04, hOffset + 0x08); // 0x08, start offset (- 0x04)
            buffer.set(textBuffers[i], dOffset);
            hOffset += (0x0C + dummy);
            dOffset += textBuffers[i].length + 0x02; // 0x00, 0x00
        }

        if (!fs.existsSync(outPath))
            fs.mkdirSync(outPath, { recursive: true });

        fs.writeFileSync(`${outPath}/${fileName}`, buffer);
        return buffer;
    }
    catch (e: any) {
        console.error(e.message);
    }
    finally {
        console.timeEnd('elapses');
    }
}

export function decompress(filePath: string, preset: PRESETS, outPath: string) {
    try {
        const buffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        console.log(`decompressing ${fileName} ...`);
        console.time('elapses');
        try {
            const header = getHeaders(preset, buffer);
            console.log(`text counts: ${header.length}`);
            const output: OutputScript = header.map(
                v => ({
                    id: v.id,
                    text: buffer.slice(v.offset, v.offset + v.length).toString('utf8')
                })
            );

            if (!fs.existsSync(outPath))
                fs.mkdirSync(outPath, { recursive: true });

            fs.writeFileSync(`${outPath}/${fileName}.txt`, JSON.stringify(output, null, 4));
            return output;
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