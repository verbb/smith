import { defineScreenshotScenario } from '@verbb/craft-screenshots/api';

import { seedSmithFixture } from '../../support/fixtures';

let entryEditRoute = '/admin/entries';

export default defineScreenshotScenario({
    id: 'smith-feature-tour-matrix-actions',
    output: 'feature-tour/smith-matrix-actions.png',
    route: () => entryEditRoute,
    viewport: { width: 1180, height: 900, deviceScaleFactor: 2 },
    async setup(context) {
        const fixture = await seedSmithFixture(context);
        entryEditRoute = fixture.entryEditRoute;
    },
    waitFor: [
        { type: 'loadState', state: 'networkidle' },
        { type: 'selector', selector: '.matrix-field .matrixblock', state: 'visible', timeout: 30000 },
    ],
    steps: [
        { type: 'wait', waitFor: { type: 'timeout', ms: 2000 } },
        { type: 'evaluate', expression: 'if (!document.querySelector(`[data-action="copy"]`)) { new Craft.Smith.Init(); }' },
        { type: 'wait', waitFor: { type: 'selector', selector: '[data-action="copy"]', state: 'attached', timeout: 30000 } },
        { type: 'click', selector: ':nth-match(.matrixblock:first-child button[aria-label="Actions"], 1)' },
        { type: 'click', selector: 'a[data-action="copy"]:visible' },
        { type: 'wait', waitFor: { type: 'timeout', ms: 200 } },
        { type: 'click', selector: ':nth-match(.matrixblock:first-child button[aria-label="Actions"], 1)' },
        { type: 'wait', waitFor: { type: 'selector', selector: 'a[data-action="paste"]:not(.disabled):visible', state: 'visible', timeout: 10000 } },
        { type: 'wait', waitFor: { type: 'timeout', ms: 250 } },
    ],
    target: {
        type: 'selector',
        selector: '.field:has(.matrix-field)',
        padding: { top: 16, right: 150, bottom: 16, left: 0 },
    },
    caption: 'Smith’s Copy, Paste, and Clone actions in the native menu of a populated Craft Matrix field.',
    intent: 'Show the real Smith-enhanced Matrix workflow with Paste enabled by copying a genuine block first.',
});
