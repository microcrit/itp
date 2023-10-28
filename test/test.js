import * as itmap from '../index.js';
import fs from 'fs';

const { parse, FileType } = itmap;

const file = await parse('./test.it');

fs.writeFileSync('./test.md', file, 'utf8');