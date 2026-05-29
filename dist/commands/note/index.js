const note = {
    type: 'local',
    name: 'note',
    description: 'Add a quick note to the current session',
    supportsNonInteractive: false,
    argumentHint: '[text]',
    load: () => import('./note.js'),
};
export default note;
