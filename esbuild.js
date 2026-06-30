const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

const baseConfig = {
    bundle: true,
    platform: 'node',
    outdir: 'dist',
    sourcemap: true,
    external: ['vscode']
};

async function build() {
    try {
        if (watch) {
            console.log('[watch] build started');
            const ctx = await esbuild.context({
                ...baseConfig,
                entryPoints: [path.join(__dirname, 'src/extension.ts')],
                plugins: [
                    {
                        name: 'watch-plugin',
                        setup(build) {
                            build.onEnd(result => {
                                if (result.errors.length > 0) {
                                    console.error('[watch] build failed:', result.errors);
                                } else {
                                    console.log('[watch] build finished');
                                }
                            });
                        }
                    }
                ]
            });
            await ctx.watch();
        } else {
            console.log('Building...');
            await esbuild.build({
                ...baseConfig,
                entryPoints: [path.join(__dirname, 'src/extension.ts')]
            });
            console.log('Build complete.');
        }
    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();