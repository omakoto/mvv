import fs from 'node:fs';
import path from 'node:path';
import $ from 'jquery';
import { vi, type Mock } from 'vitest';
import type { PopboxFactory, PopboxInstance } from '../../src/dialogs.js';

const indexHtmlPath = path.resolve(process.cwd(), 'src', 'index.html');
const rawHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const bodyInnerHtml = (bodyMatch ? bodyMatch[1]! : '').replace(/<script[\s\S]*?<\/script>/gi, '');

export function setupMvvDom(): void {
    document.body.innerHTML = bodyInnerHtml;
    (globalThis as any).$ = $;
    (globalThis as any).jQuery = $;
}

export interface MockCanvasContext {
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    font: string;
    textAlign: string;
    imageSmoothingEnabled: boolean;
    fillRect: ReturnType<typeof vi.fn>;
    drawImage: ReturnType<typeof vi.fn>;
    strokeText: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
    setLineDash: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    rect: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
}

export function createMockCanvasContext(): MockCanvasContext {
    return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        imageSmoothingEnabled: true,
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        strokeText: vi.fn(),
        fillText: vi.fn(),
        setLineDash: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        stroke: vi.fn(),
    };
}

export function installMockCanvasContexts(): Map<string, MockCanvasContext> {
    const contexts = new Map<string, MockCanvasContext>();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        const key = this.id || 'unnamed';
        let ctx = contexts.get(key);
        if (!ctx) {
            ctx = createMockCanvasContext();
            contexts.set(key, ctx);
        }
        return ctx as unknown as CanvasRenderingContext2D;
    });
    return contexts;
}

export interface MockPopboxRecord extends PopboxInstance {
    open: Mock<(tag: string) => void>;
    clear: Mock<() => void>;
    options: { blur: boolean; overlay: boolean };
}

export function createMockPopboxFactory(): {
    factory: PopboxFactory;
    instances: MockPopboxRecord[];
} {
    const instances: MockPopboxRecord[] = [];
    const factory: PopboxFactory = (options) => {
        const inst: MockPopboxRecord = {
            options,
            open: vi.fn<(tag: string) => void>(),
            clear: vi.fn<() => void>(),
        };
        instances.push(inst);
        return inst;
    };
    return { factory, instances };
}
