const run = {
    type: 'local',
    name: 'run',
    description: 'Run a specific swarm agent with an optional task',
    supportsNonInteractive: true,
    argumentHint: '<agent> [task]',
    load: () => import('./run.js'),
};
export default run;
