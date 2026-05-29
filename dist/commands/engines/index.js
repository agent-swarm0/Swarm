const engines = {
    type: 'local',
    name: 'engines',
    description: 'List all available swarm engines',
    supportsNonInteractive: true,
    load: () => import('./engines.js'),
};
export default engines;
