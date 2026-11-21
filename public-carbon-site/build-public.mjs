import { readFile, mkdir, writeFile } from 'node:fs/promises';

const source = new URL('../Deloitte碳排放管理系统-交互增强版.html', import.meta.url);
const html = (await readFile(source, 'utf8')).replaceAll('location.protocol.startsWith("http")', 'false');
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
await writeFile(new URL('./dist/index.html', import.meta.url), html);
console.log('Public HTML ready; browser-local persistence enabled.');
import { cp } from 'node:fs/promises';
await cp(new URL('../vendor/', import.meta.url), new URL('./dist/vendor/', import.meta.url), { recursive: true });
console.log('Vendor assets copied.');
