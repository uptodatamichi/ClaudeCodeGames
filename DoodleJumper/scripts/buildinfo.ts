import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';


const BUILD_INFO_FILE = 'buildinfo.txt';
const GIT_COMMAND = 'git rev-parse --short HEAD';

const version: string = JSON.parse(readFileSync('package.json', 'utf-8')).version;

let gitHash = '';
try {
    gitHash = execSync(GIT_COMMAND, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
} catch { }

const buildinfo = gitHash
    ? version.includes('+')
        ? `${version}.${gitHash}`
        : `${version}+${gitHash}`
    : version;

writeFileSync(BUILD_INFO_FILE, buildinfo.trim(), 'utf-8');

console.log(`'${BUILD_INFO_FILE}' has been updated with build info: ${buildinfo}`);
