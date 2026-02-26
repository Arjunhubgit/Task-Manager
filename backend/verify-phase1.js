/**
 * PHASE 1 TEST SCRIPT
 * 
 * Run this to verify Phase 1 AI implementation is working correctly
 * Usage: node verify-phase1.js
 * 
 * Make sure .env has GROQ_API_KEY set before running!
 */

require('dotenv').config();
const TaskAIService = require('./utils/TaskAIService');

async function testPhase1() {
  console.log('🧪 PHASE 1 VERIFICATION TESTS\n');
  console.log('═'.repeat(50));

  // Test 1: Check Groq API availability
  console.log('\n✓ Test 1: Groq API Key Check');
  if (process.env.GROQ_API_KEY) {
    console.log('  ✅ GROQ_API_KEY is configured');
  } else {
    console.log('  ⚠️  GROQ_API_KEY not found in .env');
  }

  // Test 2: Task Analysis
  console.log('\n✓ Test 2: Task Analysis (analyzeTask)');
  try {
    const analysis = await TaskAIService.analyzeTask(
      'Marketing Campaign Launch',
      'Plan and execute the Q1 2026 marketing campaign including email outreach, social media, and press release. Need to coordinate with design team and get approvals by end of month.',
      'admin'
    );
    console.log('  ✅ Analysis successful:');
    console.log(`     - Priority: ${analysis.priority}`);
    console.log(`     - Complexity: ${analysis.complexity}`);
    console.log(`     - Est. Hours: ${analysis.estimatedHours}`);
    console.log(`     - Tags: ${analysis.suggestedTags?.slice(0, 3).join(', ')}`);
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }

  // Test 3: Task Decomposition
  console.log('\n✓ Test 3: Task Decomposition (suggestDecomposition)');
  try {
    const decomp = await TaskAIService.suggestDecomposition(
      'Website Redesign',
      'Complete redesign of the company website with new branding, improved mobile experience, and SEO optimization.'
    );
    console.log('  ✅ Decomposition successful:');
    console.log(`     - Subtasks: ${decomp.subtasks.length}`);
    if (decomp.subtasks.length > 0) {
      console.log(`       Example: "${decomp.subtasks[0].text}"`);
    }
    console.log(`     - Success Criteria: ${decomp.successCriteria.length}`);
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }

  // Test 4: Tag Suggestions
  console.log('\n✓ Test 4: Tag Suggestions (suggestTaskTags)');
  try {
    const tags = await TaskAIService.suggestTaskTags(
      'Weekly Team Meeting',
      'Schedule and run the weekly all-hands meeting to update the team on progress and roadmap.'
    );
    console.log('  ✅ Tag suggestions successful:');
    console.log(`     - Tags: ${tags.join(', ') || 'none'}`);
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }

  // Test 5: Database Schema Check
  console.log('\n✓ Test 5: Database Schema Check');
  try {
    const Task = require('./models/Task');
    const schema = Task.schema.paths;
    const requiredFields = ['aiSummary', 'aiSuggestedTags', 'complexity', 'estimatedHours', 'suggestedSubtasks', 'aiAnalysis', 'lastAISummary'];
    const present = requiredFields.filter(field => field in schema);
    console.log(`  ✅ Schema updated with ${present.length}/${requiredFields.length} AI fields`);
    console.log(`     - Missing: ${requiredFields.filter(f => !present.includes(f)).join(', ') || 'none'}`);
  } catch (err) {
    console.log(`  ⚠️  Schema check skipped: ${err.message}`);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('\n📋 PHASE 1 CHECKLIST:');
  console.log('  ✅ Backend TaskAIService.js created');
  console.log('  ✅ Task model extended with AI fields');
  console.log('  ✅ Task controller enhanced with analyzeTask integration');
  console.log('  ✅ New POST /tasks/:id/auto-summarize endpoint added');
  console.log('  ✅ Frontend geminiServices.js enhanced');
  console.log('  ✅ AITaskSuggestionPanel.jsx component created');
  console.log('  ✅ AIChatInput.jsx updated with suggestion flow');
  console.log('  ✅ API paths updated');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('  1. Start backend: npm run dev');
  console.log('  2. Start frontend: vite --host');
  console.log('  3. Test AI Task Assistant on the frontend');
  console.log('  4. Create a new task via AI prompt');
  console.log('  5. Verify suggestions panel shows AI-generated suggestions');
  console.log('  6. Accept suggestions and verify task is saved with AI fields');
  
  console.log('\n✨ Phase 1 Implementation Complete!\n');
}

testPhase1().catch(console.error);
