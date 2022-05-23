import { PresetCountByteOffset, PRESETS } from './types';

export const PRESET_FAD = new Map<PRESETS, PresetCountByteOffset>([
    ['na', { anims1: 0x00, anims2: 0x04, images: 0x08, imageStartOffset: 0x18, dummy: 0x00 }],
    ['ms', { anims1: 0x04, anims2: 0x08, images: 0x0C, imageStartOffset: 0x1C, dummy: 0x10 }]
]);

export const PRESET_SCRIPT = new Map<PRESETS, number>([
    ['na', 0x00],
    ['ms', 0x04]
]);

export const PREFIX_ANIM = 'anim';
export const PREFIX_IMAGE = 'img';
export const FORMAT_ANIM = 'dat';
export const FORMAT_IMAGE = 'png';
export const AVAILABLE_PRESETS: PRESETS[] = ['na', 'ms'];
export const SPLIT_CHAR = '-';