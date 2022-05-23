import { Command, Argument } from 'commander';
import * as fad from './fad';
import * as script from './scripts';
import { PRESET_FAD, PRESET_SCRIPT } from './preset';
import { PRESETS } from 'types';

const AVAILABLE_PRESETS: PRESETS[] = ['na', 'ms'];
const program = new Command();
const fNA = PRESET_FAD.get('na')!;
const fMS = PRESET_FAD.get('ms')!;
const sNA = PRESET_SCRIPT.get('na')!;
const sMS = PRESET_SCRIPT.get('ms')!;
if (process.argv.length === 0) {
    program.help();
}


program.option('-r, --raw', 'Whether or not to output raw data.');

// <> required, [] optional
program
    .command('script')
    .addArgument(new Argument('<process>', '[Required] work you want to do, decompress or compress').choices(['dec', 'cmp']))
    .addArgument(new Argument('<preset>', '[Required] preset name required to work.').choices(AVAILABLE_PRESETS))
    .addArgument(new Argument('<path>', '[Required] file that you want to work.'))
    .addArgument(new Argument('[out_path]', '[Optional] The path you want to save.').default('./decompressed'))
    // .addArgument(new Argument('[merge_path]', '[Optional] The file path that you are want to merge.').default('./decompressed'))
    .description('work with script (*.dat) file.')
    .action(async (process, preset, path, out_path) => {
        if (process === 'dec') {
            await script.decompress(path, preset, out_path);
        }
        else {
            return;
        }
    });

program
    .command('archive')
    .addArgument(new Argument('<process>', '[Required] work you want to do, decompress or compress').choices(['dec', 'cmp']))
    .addArgument(new Argument('<preset>', '[Required] preset name required to work.').choices(AVAILABLE_PRESETS).default('na'))
    .addArgument(new Argument('<path>', '[Required] file that you want to work.'))
    .addArgument(new Argument('[out_path]', '[Optional] The path you want to save.').default('output'))
    .addArgument(new Argument('[out_filename]', '[Optional] The filename you want to save.').default('compressed.fad'))
    .description('work with YKCMP_V1 format (*.fad) file')
    .action(async (process, preset, path, out_path, out_filename) => {
        const options = program.opts();
        const p = preset === 'ms' ? fMS : fNA;
        if (process === 'dec') await fad.decompress(path, p, out_path, options.raw);
        else await fad.compress(path, p, out_path, out_filename);
    });

program
    .command('presets')
    .description('Show some presets')
    .action(() => {
        console.log('Archive format (*.fad) presets:');
        console.log('   anims1, anims2, imgs, dummy');
        console.log(`   (na) Yomawari : Night Alone (${fNA.anims1}, ${fNA.anims2}, ${fNA.images}, ${fNA.dummy})`);
        console.log(`   (ms) Yomawari : Midnight Shadows (${fMS.anims1}, ${fMS.anims2}, ${fMS.images}, ${fMS.dummy})`);
        console.log('-');
        console.log('Script format (*.dat) presets');
        console.log('   dummy');
        console.log(`   (na) Yomawari : Night Alone (${sNA})`);
        console.log(`   (ms) Yomawari : Midnight Shadows (${sMS})`);
    });

program.parse(process.argv);