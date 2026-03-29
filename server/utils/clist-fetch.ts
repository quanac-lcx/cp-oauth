import { execFile } from 'child_process';
import { resolve } from 'path';
import { consola } from 'consola';

const logger = consola.withTag('clist-fetch');

const PYTHON_SCRIPT = resolve(process.cwd(), 'server/utils/clist-fetch.py');
const PYTHON_BIN = process.env.PYTHON_PATH || 'python';
const TIMEOUT_MS = 30_000;

interface ClistFetchParams {
    method: 'GET' | 'POST';
    url: string;
    headers?: Record<string, string>;
    data?: Record<string, string>;
    sessionInit?: string;
}

interface ClistFetchResult {
    status: number;
    body: string;
    headers: Record<string, string>;
    error: string | null;
}

export async function clistFetch(params: ClistFetchParams): Promise<ClistFetchResult> {
    const input = JSON.stringify({
        method: params.method,
        url: params.url,
        headers: params.headers || {},
        data: params.data || null,
        sessionInit: params.sessionInit || null
    });

    return new Promise((resolvePromise, reject) => {
        const child = execFile(
            PYTHON_BIN,
            [PYTHON_SCRIPT],
            { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
            (error, stdout, stderr) => {
                if (stderr) {
                    logger.debug(`Python stderr: ${stderr}`);
                }

                if (error) {
                    if (error.killed) {
                        reject(
                            createError({
                                statusCode: 504,
                                message: 'Clist fetch timed out'
                            })
                        );
                        return;
                    }
                    reject(
                        createError({
                            statusCode: 502,
                            message: `Clist fetch process error: ${error.message}`
                        })
                    );
                    return;
                }

                try {
                    const result = JSON.parse(stdout) as ClistFetchResult;
                    if (result.error) {
                        logger.warn(`Clist fetch error: ${result.error}`);
                    }
                    resolvePromise(result);
                } catch {
                    logger.error(`Failed to parse clist-fetch output: ${stdout.slice(0, 500)}`);
                    reject(
                        createError({
                            statusCode: 502,
                            message: 'Failed to parse Clist fetch response'
                        })
                    );
                }
            }
        );

        child.stdin?.write(input);
        child.stdin?.end();
    });
}
