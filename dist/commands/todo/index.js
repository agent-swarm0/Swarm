const todo = {
    type: 'local',
    name: 'todo',
    description: 'Manage todos in the current session',
    supportsNonInteractive: false,
    argumentHint: '[text | done <n>]',
    load: () => import('./todo.js'),
};
export default todo;
