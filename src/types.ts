/*
Archive Header (NA)
* 0x00 4byte UInt: animation? data number 1
* 0x04 4byte UInt: animation? data number 2
* 0x08 4byte UInt: imgs data number
* 0x12 4byte UInt: unknown
* 0x16 4byte UInt: unknown
* 0x20 4byte UInt: unknown
* 0x24 4byte UInt: header length
* 0x28 4byte UInt: unknown

Archive Header (MS)
* 0x00 4byte UInt: unknown
* 0x04 4byte UInt: animation? data number 1
* 0x08 4byte UInt: animation? data number 2
* 0x12 4byte UInt: imgs data number
* 0x16 4byte UInt: header length
* 0x20 4byte UInt: unknown
* 0x24 4byte UInt: unknown
* 0x28 4byte UInt: unknown

Archive Data Header
* 0x00 8byte UTF8: name
* 0x08 4byte UInt: length
* 0x12 4byte UInt: type?
* 0x16 4byte UInt: offset

Archive Image Data Header
* 0x00 8byte UTF8: name
* 0x08 4byte UInt: length
* 0x12 4byte UInt: type?
* 0x16 4byte UInt: compressed size
* 0x20 4byte UInt: decompressed size
* 0x24 2byte UInt: width
* 0x26 2byte UInt: height
* 0x28 2byte UInt: palette entries
* 0x30 1byte UInt: bit per pixel (bpp)
* 0x31 1byte UInt: isSwizzled
*/

export type PRESETS = 'na' | 'ms';

export interface PresetCountByteOffset {
    anims1: number,
    anims2: number,
    images: number,
    imageStartOffset: number,
    dummy: number
}

export interface HeaderFad {
    name: string,
    length: number,
    type: number,
    offset: number
}

export interface HeaderImage {
    cmpSize: number,
    decSize: number,
    width: number,
    height: number,
    palEntries: number,
    bpp: number,
    swizzled: number,
}

export type Pixel = [number, number, number, number];
export type Palette = Pixel[];

/*
String Archive Header
* 0x00 4byte: string count

String Data Header (NA)
* 0x00 4byte: number? id?
* 0x04 4byte: length
* 0x08 4byte: offset (offset + 4 = start offset)

String Data Header (MS)
* 0x00 4byte: id?
* 0x04 4byte: length
* 0x08 4byte: offset (offset + 4 = start offset)
* 0x0C 4byte: dummy?
*/

export interface HeaderScript {
    id: number,
    length: number,
    offset: number,
    // text: string
}

export type OutputScript = Array<{
    id: number,
    text: string
}>;

export type MergedScript = Array<{
    id: number,
    text: {
        en_US: string,
        ja_JP: string,
        ko_KR: string
    }
}>

export interface InfoAnim {
    index: number,
    name: Buffer,
    type: number,
    path: string
}

export interface InfoImage {
    index: number,
    name: Buffer,
    bpp: number,
    palEntries: number,
    isRaw: boolean,
    path: string
}