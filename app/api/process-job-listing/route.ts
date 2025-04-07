import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProcessJobListingRequest, ProcessJobListingResponse } from '@/types';

// Simple in-memory rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute
const ipRequestMap = new Map<string, { count: number, timestamp: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);
  
  // Clean up old entries every 10 minutes
  if (now % (10 * 60 * 1000) < 1000) {
    for (const [key, value] of ipRequestMap.entries()) {
      if (now - value.timestamp > RATE_LIMIT_WINDOW) {
        ipRequestMap.delete(key);
      }
    }
  }
  
  if (!record) {
    ipRequestMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  if (now - record.timestamp > RATE_LIMIT_WINDOW) {
    // Reset counter for new window
    ipRequestMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  // Increment count
  ipRequestMap.set(ip, { count: record.count + 1, timestamp: record.timestamp });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Get API key from environment variable
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Missing AI API key' },
        { status: 500 }
      );
    }

    // Parse request body
    let requestData: ProcessJobListingRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate the request has the required text field
    if (!requestData.text || requestData.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    try {
      // Initialize the Google GenAI client
      const genAI = new GoogleGenerativeAI(googleApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      // Create the prompt for the AI
      const systemPrompt = `You are a job description parser that extracts structured information from job listings. 
Extract the key details from the job description provided and output them in a structured JSON format.

Extract ONLY what is explicitly mentioned in the text. Do not make up or infer details that aren't clearly stated.
For fields that aren't present in the text, use null or empty arrays as appropriate.

Pay special attention to:
1. Company name
2. Job title/position
3. Location (including remote options)
4. Job type (full-time, part-time, contract, etc.)
5. Salary information (including range, currency, and payment period)
6. Job description (summarize if very long)
7. Hard skills - specific technical abilities, tools, programming languages, methodologies, certifications, or technical knowledge areas. Examples include: software development languages (Python, Java), tools (Excel, Photoshop), methodologies (Agile, DevOps), technologies (AWS, microservices), or industry-specific technical knowledge (data analytics, circuit design)
8. Soft skills - interpersonal and transferable attributes such as communication, leadership, teamwork, problem-solving, adaptability, time management, creativity, and emotional intelligence
9. Requirements (extract as an array of clear requirements)
10. Benefits (extract as an array of benefits offered)

Use the following JSON format exactly:

{
  "company": "string",
  "title": "string",
  "location": "string",
  "description": "string",
  "job_type": "string",
  "salary_range_min": number or null,
  "salary_range_max": number or null,
  "salary_currency": "string or null",
  "salary_period": "string or null", // yearly, daily, hourly, etc.
  "hard_skills": string[], // Hard skills are specific technical abilities, tools, programming languages, methodologies, certifications, or technical knowledge areas. Examples include: software development languages (Python, Java), tools (Excel, Photoshop), methodologies (Agile, DevOps), technologies (AWS, microservices), or industry-specific technical knowledge (data analytics, circuit design) Return an array of strings values for each soft skill identified in the job description which fits into this category. 
  "soft_skills": string[], // Soft skills are interpersonal and transferable attributes such as communication, leadership, teamwork, problem-solving, adaptability, time management, creativity, and emotional intelligence. Return an array of strings values for each soft skill identified in the job description which fits into this category. 
  "requirements": string[],
  "benefits": string[]
}

Keep the full description intact and do not truncate it even if it's long. Be accurate with your extraction and preserve the original formatting where possible.`;
      
      // Call the Google AI
      const result = await model.generateContent({
        contents: [
          { 
            role: "user", 
            parts: [
              { text: systemPrompt },
              { text: requestData.text }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      // Parse the response
      const responseText = result.response.text();
      let extractedData;
      
      try {
        // Extract JSON from the response if needed
        const jsonMatches = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                          responseText.match(/```([\s\S]*?)```/) ||
                          [null, responseText];
        
        const cleanJson = jsonMatches[1] || responseText;
        extractedData = JSON.parse(cleanJson);
        
        // Add AI processing metadata
        const timestamp = new Date().toISOString();
        const confidence = {
          overall: 0.9, // Example confidence scores
          company: extractedData.company ? 0.95 : 0.1,
          title: extractedData.title ? 0.95 : 0.1,
          location: extractedData.location ? 0.9 : 0.1,
          job_type: extractedData.job_type ? 0.9 : 0.1,
          salary: (extractedData.salary_range_min || extractedData.salary_range_max) ? 0.8 : 0.1,
          requirements: extractedData.requirements?.length > 0 ? 0.85 : 0.1,
          benefits: extractedData.benefits?.length > 0 ? 0.85 : 0.1
        };
        
        const response: ProcessJobListingResponse = {
          success: true,
          data: {
            ...extractedData,
            raw_job_text: requestData.text,
            ai_confidence: confidence,
            ai_version: "gemini-2.0-flash",
            ai_processed_at: timestamp
          }
        };
        
        return NextResponse.json(response, { status: 200 });
      } catch (error) {
        console.error('Error parsing AI response:', error, 'Response:', responseText);
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    } catch (error: any) {
      console.error('Error processing AI request:', error);
      return NextResponse.json({ 
        error: 'Error processing AI request', 
        details: error?.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { error: 'An unhandled error occurred', details: error?.message },
      { status: 500 }
    );
  }
} 