import fs from 'fs';
import path from 'path';

import parser from './lib/parser.js';
import { FileType as ft } from './lib/others.js';

function read(file) {
    const ext = path.extname(file);
    const name = path.basename(file, ext);
    const content = fs.readFileSync(file, 'utf8');
    const filepath = file;
    return { name, ext, content, path: filepath };
};

export function parse(file) {
    const { name, ext, content, path } = read(file);
    return parser(name, ext, content, path);
}

export var FileType = ft;