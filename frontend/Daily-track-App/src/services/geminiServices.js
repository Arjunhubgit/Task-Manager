import { GoogleGenAI } from '@google/genai';

// Initialize the client using the API key from environment variables
// Note: In a real app, this should call a secure backend endpoint.
const ai = new GoogleGenAI(import.meta.env.GEMINI_API_KEY);
const prioritySchema = {
    type: "object",
    properties: {
        suggestedPriority: {
            type: "string",
            description: "Suggested priority level for the task. Must be one of: High, Medium, Low.",
        },
        aiSummary: {
            type: "string",
            description: "A one-sentence, actionable summary of the task.",
        },
    },
    required: ["suggestedPriority", "aiSummary"],
};

export async function analyzeTaskPriority(taskDescription, userRole) {
    const model = 'gemini-2.5-flash';
    
    // Construct a detailed prompt for better results
    const prompt = `Analyze the following task description for a ${userRole} and determine the appropriate priority (High, Medium, or Low). The user is a professional managing their daily work. 
    
    Task Description: "${taskDescription}"
    
    If the task involves a hard deadline, critical client work, or immediate blockers, assign 'High'. 
    If it's routine, maintenance, or non-urgent, use 'Low'. Otherwise, use 'Medium'.`;

    try {
        const response = await getGeminiClient().models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: prioritySchema,
            },
        });

        // The response.text will be a valid JSON string matching the schema
        const result = JSON.parse(response.text);
        return result;

    } catch (error) {
        console.error("Gemini API Error:", error);
        return { 
            suggestedPriority: 'Medium', 
            aiSummary: taskDescription.substring(0, 50) + '...'
        };
    }
}
export const getGeminiClient = () => ai;