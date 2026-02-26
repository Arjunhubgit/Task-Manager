/**
 * Groq Services (Frontend Utilities)
 * Provides utility functions for displaying AI-generated suggestions
 * AI analysis is performed on the backend using Groq
 */

/**
 * Format AI suggestions for frontend display
 * Useful for showing suggestions in a user-friendly way
 */
export function formatAISuggestions(aiAnalysis) {
    if (!aiAnalysis) return null;
    
    return {
        priority: aiAnalysis.priority || 'Medium',
        summary: aiAnalysis.summary || '',
        complexity: aiAnalysis.complexity || 'Medium',
        estimatedHours: aiAnalysis.estimatedHours || null,
        tags: aiAnalysis.suggestedTags || [],
        subtasks: aiAnalysis.suggestedSubtasks || [],
        riskFactors: aiAnalysis.riskFactors || [],
        reasoning: aiAnalysis.reasoning || '',
        suggestedAssignees: aiAnalysis.suggestedAssignees || [],
    };
}

/**
 * Generate a human-readable complexity badge label
 */
export function getComplexityLabel(complexity) {
    const labels = {
        'Simple': { label: '⚡ Simple', color: '#10B981' },
        'Medium': { label: '⚙️ Medium', color: '#F59E0B' },
        'Complex': { label: '🔴 Complex', color: '#EF4444' },
    };
    return labels[complexity] || labels['Medium'];
}

/**
 * Estimate time display string
 */
export function formatTimeEstimate(hours) {
    if (!hours) return 'Not estimated';
    if (hours < 1) return '30 mins';
    if (hours === 1) return '1 hour';
    if (hours <= 4) return `${Math.round(hours)} hours`;
    if (hours <= 16) return `${Math.round(hours / 8)} days`;
    return `${Math.round(hours / 40)} weeks`;
}

/**
 * Validate AI subtask structure
 */
export function validateSubtasks(subtasks) {
    if (!Array.isArray(subtasks)) return [];
    return subtasks.filter(st => st && typeof st.text === 'string' && st.text.trim().length > 0).slice(0, 10);
}

/**
 * Create task object from AI suggestions
 */
export function createTaskFromAISuggestions(formData, aiAnalysis) {
    if (!formData || !aiAnalysis) return null;
    
    return {
        title: formData.title,
        description: formData.description,
        priority: formData.priority || aiAnalysis.priority || 'Medium',
        dueDate: formData.dueDate,
        assignedTo: formData.assignedTo || [],
        tags: formData.tags || aiAnalysis.suggestedTags || [],
        suggestedSubtasks: validateSubtasks(aiAnalysis.suggestedSubtasks),
        complexity: aiAnalysis.complexity,
        estimatedHours: aiAnalysis.estimatedHours,
    };
}
