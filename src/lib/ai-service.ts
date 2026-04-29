import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

/**
 * Analyzes an image using Gemini Vision and returns a description and tags.
 * 
 * @param buffer - The image buffer to analyze
 * @param mimeType - The mime type of the image
 * @returns { description: string, tags: string[] }
 */
export async function analyzeImage(buffer: Buffer, mimeType: string) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.warn("AI Intelligence: GOOGLE_GEMINI_API_KEY is missing. Skipping analysis.");
        return { description: "", tags: [] };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Analyze this image and provide:
            1. A concise, one-sentence SEO-friendly description (Alt Text).
            2. A list of 5-8 relevant tags for categorization.
            
            Return the result in strictly this JSON format:
            {
                "description": "...",
                "tags": ["tag1", "tag2", ...]
            }
        `;

        const imagePart = {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        // Clean up the response (Gemini sometimes adds markdown blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            return {
                description: data.description || "",
                tags: Array.isArray(data.tags) ? data.tags : []
            };
        }

        return { description: "", tags: [] };
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return { description: "", tags: [] };
    }
}
