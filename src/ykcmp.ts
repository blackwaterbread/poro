// https://github.com/iltrof/ykcmp/blob/master/ykcmp/ykcmp.cpp
const MAGIC_YKCMP = Buffer.from([ 0x59, 0x4B, 0x43, 0x4D, 0x50, 0x5F, 0x56, 0x31 ]);
const BYTES_UNKNOWN = Buffer.from([0x04, 0x00, 0x00, 0x00]);
const BYTE_NAIVE_SPLIT = 0x7F;

export function decompress(buffer: Buffer): Buffer {
    if (Buffer.compare(buffer.slice(0, 0x08), MAGIC_YKCMP) !== 0)
        throw new Error('Invalid Format');

    const dSize = buffer.readInt32LE(0x10);
    const result = Buffer.alloc(dSize);
    let op = 0;
    let offset = 0x14;
    while (op < dSize)
    {
        const n = buffer[offset++];
        if (n < 0x80) {
            for (let n2 = 0; n2 < n; n2++) {
                result[op++] += buffer[offset++];
            }
        }
        else {
            let sz, offset_back = 0;
            if (n < 0xC0) {
                sz = (n >> 4) - 7;
                offset_back = (n & 0x0F) + 1;
            }
            else if (n < 0xE0) {
                sz = n - 0xBE;
                offset_back = buffer[offset++] + 1;
            }
            else {
                let n2 = buffer[offset++];
                let n3 = buffer[offset++];
                sz = (n << 4) + (n2 >> 4) - 0xDFD;
                offset_back = ((n2 & 0x0F) << 8) + n3 + 1;
            }
            let opt = op - offset_back;
            for (let j = 0; j < sz; j++) {
                result[op++] = result[opt++];
            }
        }
    }
    return result;
}

export function compress(data: Buffer): Buffer {
    const chunks = data.length / BYTE_NAIVE_SPLIT;
    const rest = data.length % BYTE_NAIVE_SPLIT;
    let maxSize = chunks * 0x80;

    if (rest !== 0)
        maxSize += (rest + 1);

    const buffer = Buffer.alloc(maxSize + 0x14);
    buffer.set([ ...MAGIC_YKCMP, ...BYTES_UNKNOWN ], 0x00);
    buffer.writeUInt32LE(data.length, 0x10);

    // if (level === 0) compressNaive(data, buffer, chunks, rest)
    // else compressNormal(data, buffer, level);

    compressNaive(data, buffer, chunks, rest)
    buffer.writeUInt32LE(buffer.length, 0x0C);
    return buffer;
}

function compressNaive(data: Buffer, result: Buffer, chunks: number, rest: number) {
    const fChunk = Math.floor(chunks);
    let dPos = 0x00, rPos = 0x14;
    for (let i = 0; i < fChunk; i++) {
        result[rPos++] = BYTE_NAIVE_SPLIT;
        result.set(data.slice(dPos, dPos + BYTE_NAIVE_SPLIT), rPos);
        dPos += BYTE_NAIVE_SPLIT;
        rPos += BYTE_NAIVE_SPLIT;
    }
    if (rest !== 0) {
        result[rPos++] = rest;
        result.set(data.slice(dPos, dPos + rest), rPos);
    }
}