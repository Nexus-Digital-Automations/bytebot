const fs = require('fs');
const path = '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot/packages/bytebot-agent/TODO.json';

// Read TODO.json directly
const todoData = JSON.parse(fs.readFileSync(path, 'utf8'));

let modified = false;
todoData.tasks.forEach(task => {
  if ((task.title.includes('test coverage') || 
       task.title.includes('test suite') || 
       task.title.includes('test framework') ||
       task.description.includes('test coverage') ||
       task.description.includes('NO TEST COVERAGE')) &&
      task.category !== 'missing-test') {
    
    console.log(`Reclassifying ${task.id}: ${task.title.substring(0, 50)}...`);
    task.category = 'missing-test';
    task.last_modified = new Date().toISOString();
    modified = true;
  }
});

if (modified) {
  fs.writeFileSync(path, JSON.stringify(todoData, null, 2));
  console.log('Successfully reclassified test tasks to missing-test category');
} else {
  console.log('No tasks needed reclassification');
}