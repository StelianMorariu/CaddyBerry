'use strict';

const G = '\x1b[38;5;78m'; // emerald green
const D = '\x1b[2m';        // dim
const R = '\x1b[0m';        // reset

const version = process.env.APP_VERSION ? `v${process.env.APP_VERSION}` : '';

process.stdout.write(
  [
    '',
    `${G} _____           _     _      ______                      ${R}`,
    `${G}/  __ \\         | |   | |     | ___ \\                     ${R}`,
    `${G}| /  \\/ __ _  __| | __| |_   _| |_/ / ___ _ __ _ __ _   _ ${R}`,
    `${G}| |    / _\` |/ _\` |/ _\` | | | | ___ \\/ _ \\ '__| '__| | | |${R}`,
    `${G}| \\__/\\ (_| | (_| | (_| | |_| | |_/ /  __/ |  | |  | |_| |${R}`,
    `${G} \\____/\\__,_|\\__,_|\\__,_|\\__, \\____/ \\___|_|  |_|   \\__, |${R}  ${D}${version}${R}`,
    `${G}                          __/ |                      __/ |${R}`,
    `${G}                         |___/                      |___/ ${R}`,
    '',
  ].join('\n'),
);

require('./server.js');
