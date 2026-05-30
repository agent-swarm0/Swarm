import type { Command } from '../../commands.js'

const focus = {
  type: 'local-jsx',
  name: 'focus',
  description:
    'Focus on a specific agent in the swarm to monitor their progress and state',
  immediate: true,
  load: () => import('./focus.js'),
} satisfies Command

export default focus
