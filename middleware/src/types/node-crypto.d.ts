// Worker build only: the single Node API used, available through the `nodejs_compat` flag.
// The test tsconfig uses @types/node instead and excludes this file.
declare module 'node:crypto' {
  export function pbkdf2Sync(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keylen: number,
    digest: string,
  ): { toString(encoding: 'hex'): string };
}
