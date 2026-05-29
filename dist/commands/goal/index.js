const goal = {
    type: 'local',
    name: 'goal',
    description: 'Set or view the current session goal',
    supportsNonInteractive: false,
    argumentHint: '[description]',
    load: () => import('./goal.js'),
};
export default goal;
