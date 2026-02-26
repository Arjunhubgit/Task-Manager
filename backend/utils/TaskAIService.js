/**
 * TaskAIService.js
 * Centralized AI service for task-related operations using Groq (Llama 3)
 * Handles: task analysis, suggestions, summary generation, tag recommendations, decomposition
 */

const Groq = require("groq-sdk");

// Initialize Groq Client
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const AI_MODEL = "llama-3.3-70b-versatile";

// =====================================================================
// --- SMART MODEL SELECTION ---
// =====================================================================

/**
 * Assess task complexity for smart model routing
 * @param {Object} task - Task object
 * @returns {string} 'simple' | 'medium' | 'complex'
 */
function assessTaskComplexity(task) {
  let complexityScore = 0;

  // Description length
  if (task.description) {
    const descLength = task.description.length;
    if (descLength > 500) complexityScore += 2;
    else if (descLength > 200) complexityScore += 1;
  }

  // Number of assignees
  if (task.assignedTo && task.assignedTo.length > 1) complexityScore += 1;

  // Priority
  if (task.priority === 'High') complexityScore += 2;
  else if (task.priority === 'Medium') complexityScore += 1;

  // Checklists
  if (task.todoChecklist && task.todoChecklist.length > 5) complexityScore += 2;
  else if (task.todoChecklist && task.todoChecklist.length > 0) complexityScore += 1;

  // Attachments
  if (task.attachments && task.attachments.length > 2) complexityScore += 1;

  // Comments
  if (task.comments && task.comments.length > 5) complexityScore += 1;

  // Determine complexity
  if (complexityScore >= 5) return 'complex';
  if (complexityScore >= 2) return 'medium';
  return 'simple';
}

/**
 * Select optimal model based on complexity
 * @param {string} taskComplexity - 'simple' | 'medium' | 'complex'
 * @returns {string} Model name
 */
function selectModelForComplexity(taskComplexity) {
  const models = {
    simple: 'llama-3.1-8b-instant',      // 💰 Fast & cheap
    medium: 'llama-3.3-70b-versatile',   // 🎯 Balanced
    complex: 'llama-3.3-70b-versatile',  // 🧠 Best reasoning
  };
  return models[taskComplexity] || AI_MODEL;
}

// =====================================================================
// --- EXPORTED HELPER FUNCTIONS ---
// =====================================================================

function getTaskComplexity(task) {
  return assessTaskComplexity(task);
}

function getOptimalModel(task) {
  const complexity = assessTaskComplexity(task);
  return selectModelForComplexity(complexity);
}

/**
 * Analyzes task description and returns data-driven suggestions
 * @param {string} taskTitle - Task title/name
 * @param {string} taskDescription - Detailed task description
 * @param {string} userRole - createdBy user role (for context)
 * @returns {Promise<Object>} {priority, summary, estimatedHours, riskFactors, suggestedTags}
 */
async function analyzeTask(taskTitle, taskDescription, userRole = "user") {
  if (!groq) {
    console.warn("Groq API not configured. Returning default analysis.");
    return getDefaultAnalysis(taskTitle, taskDescription);
  }

  try {
    const prompt = `Analyze this task and provide structured recommendations:

Task Title: "${taskTitle}"
Task Description: "${taskDescription}"
User Role: ${userRole}

Provide a JSON response with:
1. "priority": string ("High", "Medium", or "Low") - based on urgency, deadline presence, impact
2. "summary": string - one-sentence actionable summary (max 80 chars)
3. "estimatedHours": number - rough estimate (0.5, 1, 2, 4, 8, 16)
4. "riskFactors": array of strings - potential blockers or risks
5. "suggestedTags": array of 3-5 short tags for categorization
6. "complexity": string ("Simple", "Medium", "Complex") - based on description
7. "reasoning": string - explain priority decision in one sentence

Focus on practical, actionable advice for a professional team.`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: AI_MODEL,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Extract JSON from response (Groq may include markdown formatting)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON response");
    
    const analysis = JSON.parse(jsonMatch[0]);
    return {
      priority: analysis.priority || "Medium",
      summary: analysis.summary || taskTitle.substring(0, 80),
      estimatedHours: analysis.estimatedHours || 2,
      riskFactors: analysis.riskFactors || [],
      suggestedTags: analysis.suggestedTags || [],
      complexity: analysis.complexity || "Medium",
      reasoning: analysis.reasoning || "",
    };
  } catch (error) {
    console.error("TaskAIService.analyzeTask error:", error.message);
    return getDefaultAnalysis(taskTitle, taskDescription);
  }
}

/**
 * Suggests subtasks and checklist items for task decomposition
 * @param {string} taskTitle - Main task title
 * @param {string} taskDescription - Task description
 * @returns {Promise<Object>} {subtasks: [{text, completed}, ...], successCriteria: [...]}
 */
async function suggestDecomposition(taskTitle, taskDescription) {
  if (!groq) {
    console.warn("Groq API not configured. Returning default decomposition.");
    return { subtasks: [], successCriteria: [] };
  }

  try {
    const prompt = `Break down this task into manageable subtasks and define success criteria:

Task: "${taskTitle}"
Details: "${taskDescription}"

Provide a JSON response with:
1. "subtasks": array of 3-7 specific, actionable subtasks (strings)
2. "successCriteria": array of 2-4 measurable success indicators
3. "estimatedDurationPerSubtask": array of estimated hours for each subtask

Make subtasks concrete and independent where possible.`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: AI_MODEL,
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON response");
    
    const decomposition = JSON.parse(jsonMatch[0]);
    
    return {
      subtasks: (decomposition.subtasks || []).map((task, idx) => ({
        text: task,
        completed: false,
        estimatedHours: decomposition.estimatedDurationPerSubtask?.[idx] || 1,
      })),
      successCriteria: decomposition.successCriteria || [],
    };
  } catch (error) {
    console.error("TaskAIService.suggestDecomposition error:", error.message);
    return { subtasks: [], successCriteria: [] };
  }
}

/**
 * Generates an AI-powered task summary from current task state
 * Useful for status updates and task reviews
 * @param {Object} task - Task document with title, description, status, progress, assignedTo, etc.
 * @returns {Promise<string>} Summary of task current state and next steps
 */
async function generateTaskSummary(task) {
  if (!groq) {
    return `${task.title} - ${task.status} (${task.progress || 0}% complete)`;
  }

  try {
    // 🎯 Smart model selection
    const selectedModel = getOptimalModel(task);
    const taskComplexity = assessTaskComplexity(task);

    const assignedCount = task.assignedTo?.length || 0;
    const completedTodos = task.todoChecklist?.filter(t => t.completed).length || 0;
    const totalTodos = task.todoChecklist?.length || 0;

    const prompt = `Generate a professional one-paragraph summary of this task's current state:

Task: "${task.title}"
Description: "${task.description || "N/A"}"
Status: ${task.status}
Progress: ${task.progress || 0}%
Checklist: ${completedTodos}/${totalTodos} items done
Assigned to: ${assignedCount} team member(s)
Priority: ${task.priority}
Tags: ${task.tags?.join(", ") || "none"}

Provide an encouraging, action-oriented summary (2-3 sentences max) that:
1. Acknowledges current progress
2. Highlights what's coming next
3. Notes any risks if status looks stalled`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: selectedModel,
      temperature: 0.6,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || `${task.title} - Status: ${task.status}`;
  } catch (error) {
    console.error("TaskAIService.generateTaskSummary error:", error.message);
    return `${task.title} - ${task.status}`;
  }
}

/**
 * Suggests tags for a task based on its content
 * @param {string} taskTitle
 * @param {string} taskDescription
 * @param {Array<string>} existingTags - Tags already assigned (avoid duplication)
 * @returns {Promise<Array<string>>} Array of suggested tags
 */
async function suggestTaskTags(taskTitle, taskDescription, existingTags = []) {
  if (!groq) {
    return [];
  }

  try {
    const prompt = `Suggest 4-6 categorical tags for this task (2-3 words each, lowercase, hyphenated):

Task: "${taskTitle}"
Description: "${taskDescription}"
Already has: ${existingTags.length ? existingTags.join(", ") : "none"}

Tags should help with: project area, work type, priority category, skill required.
Avoid duplicating existing tags.
Return ONLY a JSON array of strings like ["tag-one", "tag-two", "tag-three"].`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: AI_MODEL,
      temperature: 0.5,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Invalid JSON array response");
    
    const tags = JSON.parse(jsonMatch[0]);
    return Array.isArray(tags) ? tags.filter(t => !existingTags.includes(t)).slice(0, 6) : [];
  } catch (error) {
    console.error("TaskAIService.suggestTaskTags error:", error.message);
    return [];
  }
}

/**
 * Generates AI reasoning for why a task might be risky or blocked
 * @param {Object} task - Task document
 * @param {Array<Object>} allTeamTasks - All tasks for context (dependencies)
 * @returns {Promise<string>} Risk assessment and recommendations
 */
async function assessTaskRisk(task, allTeamTasks = []) {
  if (!groq) {
    return "Unable to assess risk at this time.";
  }

  try {
    // 🎯 Smart model selection
    const selectedModel = getOptimalModel(task);

    const daysUntilDue = task.dueDate 
      ? Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const prompt = `Assess the risk of this task being delayed or blocked:

Task: "${task.title}"
Status: ${task.status}
Priority: ${task.priority}
Days until due: ${daysUntilDue !== null ? daysUntilDue : "Unknown"}
Progress: ${task.progress || 0}%
Assigned to: ${task.assignedTo?.length || 0} person(s)
Comments: ${task.comments?.length || 0} (team discussion)
Blockers mentioned: ${task.description?.toLowerCase().includes("block") ? "Yes" : "No"}

In 1-2 sentences, provide a risk assessment and one specific recommendation. Be concise.`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: selectedModel,
      temperature: 0.6,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || "No risk assessment available.";
  } catch (error) {
    console.error("TaskAIService.assessTaskRisk error:", error.message);
    return "Unable to assess risk at this time.";
  }
}

/**
 * Batch similarity check - avoid redundant AI analysis calls
 * @param {string} newDescription - New task description
 * @param {Array<Object>} recentTasks - Recent tasks to compare
 * @returns {Promise<Array>} Similar existing tasks (by AI analysis)
 */
async function findSimilarTasks(newDescription, recentTasks = []) {
  if (!groq || !recentTasks.length) {
    return [];
  }

  try {
    const taskList = recentTasks
      .map((t, i) => `${i + 1}. "${t.title}" - ${t.description?.substring(0, 50)}`)
      .join("\n");

    const prompt = `I'm creating this new task:
"${newDescription}"

Here are similar recent tasks:
${taskList}

Which existing tasks (list by number) are most similar? List only numbers separated by commas (e.g., "1,3,5").
Return ONLY the numbers, or empty string if none are similar.`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: AI_MODEL,
      temperature: 0.3,
      max_tokens: 50,
    });

    const indices = response.choices[0]?.message?.content?.split(",").map(n => parseInt(n.trim()) - 1).filter(n => !isNaN(n)) || [];
    return indices.map(i => recentTasks[i]).filter(Boolean);
  } catch (error) {
    console.error("TaskAIService.findSimilarTasks error:", error.message);
    return [];
  }
}

/**
 * Default fallback analysis when Groq is unavailable
 */
function getDefaultAnalysis(taskTitle, taskDescription) {
  return {
    priority: "Medium",
    summary: taskTitle.substring(0, 80),
    estimatedHours: 2,
    riskFactors: [],
    suggestedTags: ["unreviewed"],
    complexity: "Medium",
    reasoning: "AI analysis not available; defaults applied.",
  };
}

module.exports = {
  analyzeTask,
  suggestDecomposition,
  generateTaskSummary,
  suggestTaskTags,
  assessTaskRisk,
  findSimilarTasks,
  getTaskComplexity,
  getOptimalModel,
  assessTaskComplexity,
  selectModelForComplexity,
};
