// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { info, infoRaw, setDebug, toggleDebug } from '../src/util.js';
import { setupMvvDom } from './helpers/dom-setup.js';

describe('util (DOM status integration)', () => {
    beforeEach(() => {
        setupMvvDom();
        setDebug(false);
    });

    afterEach(() => {
        setDebug(false);
    });

    it('updates #status text and makes it visible via infoRaw and info', () => {
        $('#status').hide();
        infoRaw('Loaded', '3', 'events');
        expect($('#status').text()).toBe('Loaded 3 events');
        expect($('#status').css('display')).not.toBe('none');

        info('Playback started');
        expect($('#status').text()).toBe('Playback started');
    });

    it('updates #status message when toggleDebug is called', () => {
        toggleDebug();
        expect($('#status').text()).toBe('Debug log is now enabled');
        toggleDebug();
        expect($('#status').text()).toBe('Debug log is now disabled');
    });
});
