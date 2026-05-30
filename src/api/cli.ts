import { run } from './router.js';

async function main() {
    const args = process.argv.slice(2);
    const options: any = {
        mode: 'API',
        goal: '',
        provider: '',
        apiKey: '',
        agentSlug: '',
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--provider' && args[i + 1]) {
            options.provider = args[++i];
        } else if (args[i] === '--api-key' && args[i + 1]) {
            options.apiKey = args[++i];
        } else if (args[i] === '--agent' && args[i + 1]) {
            options.agentSlug = args[++i];
        } else if (!args[i].startsWith('--')) {
            options.goal = args[i];
        }
    }

    if (!options.goal || !options.provider || !options.apiKey) {
        console.error('Missing required arguments: --provider, --api-key, and a goal are required.');
        process.exit(1);
    }

    try {
        const result = await run(options);
        if (result.stream) {
            for await (const chunk of result.stream) {
                process.stdout.write(chunk);
            }
            process.stdout.write('\n');
        } else {
            console.log(result.output);
        }
    } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
