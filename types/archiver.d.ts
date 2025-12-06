declare module 'archiver' {
    import { Readable, Transform } from 'stream';

    interface ArchiverOptions {
        zlib?: { level?: number };
        store?: boolean;
        statConcurrency?: number;
        highWaterMark?: number;
    }

    interface EntryData {
        name?: string;
        prefix?: string;
        date?: Date | string;
        mode?: number;
        store?: boolean;
    }

    interface Archiver extends Transform {
        append(source: Buffer | Readable | string, data?: EntryData): this;
        directory(dirpath: string, destpath: string | false, data?: EntryData): this;
        file(filepath: string, data?: EntryData): this;
        glob(pattern: string, options?: object, data?: EntryData): this;
        finalize(): Promise<void>;
        pointer(): number;
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: 'warning', listener: (warning: Error) => void): this;
        on(event: 'entry', listener: (entry: EntryData) => void): this;
        on(event: 'progress', listener: (progress: { entries: { total: number; processed: number }; fs: { totalBytes: number; processedBytes: number } }) => void): this;
        on(event: 'close' | 'end' | 'finish' | 'drain', listener: () => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
    }

    function archiver(format: 'zip' | 'tar' | 'json', options?: ArchiverOptions): Archiver;

    export = archiver;
}
