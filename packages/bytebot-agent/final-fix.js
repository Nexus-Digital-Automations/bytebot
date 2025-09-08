const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager.js');
const tm = new TaskManager(
  '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot/packages/bytebot-agent/TODO.json',
);

const testTasks = [
  'task_1757121910664_t08mei2ff', // orchestrator test coverage
  'task_1757121885706_8f5ebepaf', // test framework setup
  'task_1757121874778_d9ma8nqah', // bytebot-ui test suite
  'task_1757121865446_jazsb60xj', // shared package test suite
  'task_1757121845633_g0ins5tx0', // bytebot-agent test suite
];

testTasks.forEach((taskId) => {
  try {
    const result = tm.updateTask(taskId, { category: 'missing-test' });
    console.log(`Successfully reclassified ${taskId}: ${result}`);
  } catch (error) {
    console.log(`Failed to reclassify ${taskId}: ${error.message}`);
  }
});

console.log('Reclassification process completed');
