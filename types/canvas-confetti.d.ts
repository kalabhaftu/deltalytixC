declare module 'canvas-confetti' {
    export default function confetti(options?: any): Promise<any>;
    export function create(canvas: HTMLCanvasElement, options?: any): (options?: any) => Promise<any>;
}
