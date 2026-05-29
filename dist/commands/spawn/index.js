const spawn = {
    type: 'local',
    name: 'spawn',
    description: 'Spawn a swarm agent as a background sub-task',
    supportsNonInteractive: true,
    argumentHint: '<agent> [task]',
    load: () => import('./spawn.js'),
};
export default spawn;
