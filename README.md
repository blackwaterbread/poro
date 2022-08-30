<p align="center">
    <img alt="poro" src="https://user-images.githubusercontent.com/40688555/92610518-bcb1d580-f2f2-11ea-8f9f-6c5206adf42a.png"/>
</p>

# What is this?
~~A loyal dog~~   
The codes used in the translation project of the "Yomawari" series.   
It may be applicable to other Nippon Ichi Software games if modified properly.

# You may need
* [Node.js 14.x or Upper](https://nodejs.org)

# How to Use
```
Usage:
    ts-node src/app.ts <process> ...some options (source)
    node poro.js <process> ...some options (release)
Commands:
    script <process> <preset> <path> [out_path]                  work with script (*.dat) file.
    archive <process> <preset> <path> [out_path] [out_filename]  work with YKCMP_V1 format (*.fad) file
    presets                                                      Show some presets (na, ms)
    help [command]                                               display help for command
Options:
    -r, --raw: Whether or not to output raw data (for decompressing)
Examples:
    Decompress some midnight shadows image archive
    --> ts-node src/app.ts archive dec ms data/ch6030.fad decompressed
```

# Thanks to
* [iltrof](https://github.com/iltrof) / [ykcmp](https://github.com/iltrof/ykcmp)
* [yukinogatari](https://github.com/yukinogatari) / [Reverse-Engineering](https://github.com/yukinogatari/Reverse-Engineering)
* [xdanieldzd](https://github.com/xdanieldzd) / [Scarlet](https://github.com/xdanieldzd/Scarlet)