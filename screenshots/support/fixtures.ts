import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ScreenshotSetupContext } from '@verbb/craft-screenshots/types';

type SmithFixture = {
    entryEditRoute: string;
};

const supportDir = dirname(fileURLToPath(import.meta.url));
const seedScript = readFileSync(join(supportDir, 'seed', 'seed-smith-entry.php'), 'utf8');

/** Seed the populated Matrix entry used by the Smith feature capture. */
export async function seedSmithFixture(context: ScreenshotSetupContext): Promise<SmithFixture> {
    const output = await context.runCraftScript(seedScript, { label: 'seed-smith-entry' });
    const fixture = JSON.parse(output.trim()) as SmithFixture;

    if (!fixture.entryEditRoute) {
        throw new Error(`Invalid Smith fixture payload: ${output}`);
    }

    return fixture;
}
