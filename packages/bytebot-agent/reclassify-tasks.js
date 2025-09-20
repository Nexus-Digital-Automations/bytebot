const TaskManager = require('/Users/jeremyparker/Desktop/Claude Coding Projects/infinite-continue-stop-hook/lib/taskManager.js');
const tm = new TaskManager(
  '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot/packages/bytebot-agent/TODO.json',
);

// Read the current TODO and directly modify the categories
const todo = tm.readTodoSync();
let modified = false;

todo.tasks.forEach((task) => {
  // Identify test coverage tasks and reclassify them
  if (
    task.title.includes('test coverage') ||
    task.title.includes('test suite') ||
    task.title.includes('test framework') ||
    task.description.includes('test coverage') ||
    task.description.includes('NO TEST COVERAGE')
  ) {
    if (task.category !== 'missing-test') {
      console.log(
        `Reclassifying ${task.id}: ${task.title.substring(0, 50)}...`,
      );
      task.category = 'missing-test';
      task.last_modified = new Date().toISOString();
      modified = true;
    }
  }
});

if (modified) {
  tm.writeTodo();
  console.log('Successfully reclassified test tasks to missing-test category');
} else {
  console.log('No test tasks found that needed reclassification');
}
