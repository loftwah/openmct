/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2022, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

const { test } = require('../../../fixtures.js');
const { expect } = require('@playwright/test');

test.describe('Time conductor operations', () => {
    test('validate start time does not exceeds end time', async ({ page }) => {
        // Go to baseURL
        await page.goto('./', { waitUntil: 'networkidle' });
        const year = new Date().getFullYear();

        let startDate = 'xxxx-01-01 01:00:00.000Z';
        startDate = year + startDate.substring(4);

        let endDate = 'xxxx-01-01 02:00:00.000Z';
        endDate = year + endDate.substring(4);

        const startTimeLocator = page.locator('input[type="text"]').first();
        const endTimeLocator = page.locator('input[type="text"]').nth(1);

        // Click start time
        await startTimeLocator.click();

        // Click end time
        await endTimeLocator.click();

        await endTimeLocator.fill(endDate.toString());
        await startTimeLocator.fill(startDate.toString());

        // invalid start date
        startDate = (year + 1) + startDate.substring(4);
        await startTimeLocator.fill(startDate.toString());
        await endTimeLocator.click();

        const startDateValidityStatus = await startTimeLocator.evaluate((element) => element.checkValidity());
        expect(startDateValidityStatus).not.toBeTruthy();

        // fix to valid start date
        startDate = (year - 1) + startDate.substring(4);
        await startTimeLocator.fill(startDate.toString());

        // invalid end date
        endDate = (year - 2) + endDate.substring(4);
        await endTimeLocator.fill(endDate.toString());
        await startTimeLocator.click();

        const endDateValidityStatus = await endTimeLocator.evaluate((element) => element.checkValidity());
        expect(endDateValidityStatus).not.toBeTruthy();
    });
});

// Testing instructions:
// Try to change the realtime offsets when in realtime (local clock) mode.
test.describe('Time conductor input fields real-time mode', () => {
    test('validate input fields in real-time mode', async ({ page }) => {
        const startOffset = {
            secs: '23'
        };

        const endOffset = {
            secs: '31'
        };

        // Go to baseURL
        await page.goto('./', { waitUntil: 'networkidle' });

        // Switch to real-time mode
        await setRealTimeMode(page);

        // Set start time offset
        await setStartOffset(page, startOffset);

        // Verify time was updated on time offset button
        await expect(page.locator('data-testid=conductor-start-offset-button')).toContainText('00:30:23');

        // Set end time offset
        await setEndOffset(page, endOffset);

        // Verify time was updated on preceding time offset button
        await expect(page.locator('data-testid=conductor-end-offset-button')).toContainText('00:00:31');
    });

    /**
     * Verify that offsets and url params are preserved when switching
     * between fixed timespan and real-time mode.
     */
    test('preserve offsets and url params when switching between fixed and real-time mode', async ({ page }) => {
        const startOffset = {
            mins: '30',
            secs: '23'
        };

        const endOffset = {
            secs: '01'
        };

        // Convert offsets to milliseconds
        const startDelta = (30 * 60 * 1000) + (23 * 1000);
        const endDelta = (1 * 1000);

        // Go to baseURL
        await page.goto('./', { waitUntil: 'networkidle' });

        // Switch to real-time mode
        await setRealTimeMode(page);

        // Set start time offset
        await setStartOffset(page, startOffset);

        // Set end time offset
        await setEndOffset(page, endOffset);

        // Switch to fixed timespan mode
        await setFixedTimeMode(page);

        // Switch back to real-time mode
        await setRealTimeMode(page);

        // Verify updated start time offset persists after mode switch
        await expect(page.locator('data-testid=conductor-start-offset-button')).toContainText('00:30:23');

        // Verify updated end time offset persists after mode switch
        await expect(page.locator('data-testid=conductor-end-offset-button')).toContainText('00:00:01');

        // Verify url parameters persist after mode switch
        await page.waitForNavigation();
        expect(page.url()).toContain(`startDelta=${startDelta}`);
        expect(page.url()).toContain(`endDelta=${endDelta}`);
    });
});

/**
 * @typedef {Object} OffsetValues
 * @property {string | undefined} hours
 * @property {string | undefined} mins
 * @property {string | undefined} secs
 */

/**
 * Set the values (hours, mins, secs) for the start time offset when in realtime mode
 * @param {import('@playwright/test').Page} page
 * @param {OffsetValues} offset
 */
async function setStartOffset(page, offset) {
    const startOffsetButton = page.locator('data-testid=conductor-start-offset-button');
    await setTimeConductorOffset(page, offset, startOffsetButton);
}

/**
 * Set the values (hours, mins, secs) for the end time offset when in realtime mode
 * @param {import('@playwright/test').Page} page
 * @param {OffsetValues} offset
 */
async function setEndOffset(page, offset) {
    const endOffsetButton = page.locator('data-testid=conductor-end-offset-button');
    await setTimeConductorOffset(page, offset, endOffsetButton);
}

/**
 * Set the time conductor to fixed timespan mode
 * @param {import('@playwright/test').Page} page
 */
async function setFixedTimeMode(page) {
    await setTimeConductorMode(page, true);
}

/**
 * Set the time conductor to realtime mode
 * @param {import('@playwright/test').Page} page
 */
async function setRealTimeMode(page) {
    await setTimeConductorMode(page, false);
}

/**
 * Set the values (hours, mins, secs) for the TimeConductor offsets when in realtime mode
 * @param {import('@playwright/test').Page} page
 * @param {OffsetValues} offset
 * @param {import('@playwright/test').Locator} offsetButton
 */
async function setTimeConductorOffset(page, {hours, mins, secs}, offsetButton) {
    await offsetButton.click();

    if (hours) {
        await page.fill('.pr-time-controls__hrs', hours);
    }

    if (mins) {
        await page.fill('.pr-time-controls__mins', mins);
    }

    if (secs) {
        await page.fill('.pr-time-controls__secs', secs);
    }

    // Click the check button
    await page.locator('.icon-check').click();
}

/**
 * Set the time conductor mode to either fixed timespan or realtime mode.
 * @param {import('@playwright/test').Page} page
 * @param {boolean} [isFixedTimespan=true] true for fixed timespan mode, false for realtime mode; default is true
 */
async function setTimeConductorMode(page, isFixedTimespan = true) {
    // Click 'mode' button
    await page.locator('.c-mode-button').click();

    // Switch time conductor mode
    if (isFixedTimespan) {
        await page.locator('data-testid=conductor-modeOption-fixed').click();
    } else {
        await page.locator('data-testid=conductor-modeOption-realtime').click();
    }
}
