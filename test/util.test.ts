import { describe, it, expect, vi, afterEach } from 'vitest';
import { DEBUG, debug, getCurrentTime, info, infoRaw, setDebug, toggleDebug } from '../src/util.js';

describe('util', () => {
    afterEach(() => {
        setDebug(false);
    });

    describe('debug logging', () => {
        it('logs only when DEBUG is enabled', () => {
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

            setDebug(false);
            expect(DEBUG).toBe(false);
            debug('hidden', 123);
            expect(spy).not.toHaveBeenCalled();

            setDebug(true);
            expect(DEBUG).toBe(true);
            debug('visible', 456);
            expect(spy).toHaveBeenCalledWith('visible', 456);
        });

        it('toggleDebug flips DEBUG flag', () => {
            setDebug(false);
            toggleDebug();
            expect(DEBUG).toBe(true);
            toggleDebug();
            expect(DEBUG).toBe(false);
        });
    });

    describe('info and infoRaw without DOM/jQuery', () => {
        it('does not throw when jQuery is not loaded', () => {
            expect(() => info('hello', 'world')).not.toThrow();
            expect(() => infoRaw('raw message')).not.toThrow();
        });
    });

    describe('getCurrentTime', () => {
        it('formats date as yyyy-mm-dd-hh-mm-ss in local time', () => {
            const sample = new Date(2025, 0, 5, 9, 4, 7); // Jan 5, 2025 09:04:07 local
            expect(getCurrentTime(sample)).toBe('2025-01-05-09-04-07');
        });

        it('matches yyyy-mm-dd-hh-mm-ss pattern for default current date', () => {
            expect(getCurrentTime()).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
        });
    });
});
