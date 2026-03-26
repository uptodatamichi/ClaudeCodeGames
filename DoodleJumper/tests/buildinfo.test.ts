import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';


const buildinfoUrl = new URL('../buildinfo.txt', import.meta.url);

// taken from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
// Captures: [1]=major, [2]=minor, [3]=patch, [4]=pre-release, [5]=build-metadata
const SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function readBuildinfo(): string {
    return readFileSync(fileURLToPath(buildinfoUrl), 'utf-8').trim();
}

describe('buildInfo', () => {

    it('should be a valid semver string', () => {
        expect(readBuildinfo()).toMatch(SEMVER_REGEX);
    });

});
