import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from Supabase secrets.");
    }
    if (!GEMINI_API_KEY.startsWith("AIzaSy")) {
      throw new Error(`The provided API key does not look like a valid Google AI Studio key. Valid keys must start with 'AIzaSy'. Your key starts with '${GEMINI_API_KEY.substring(0, 4)}...'. Please generate a new key at https://aistudio.google.com/app/apikey`);
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const body = await req.json();
    const { projectId, drawingId, pages } = body;

    if (!projectId || !drawingId || !pages || pages.length === 0) {
      throw new Error('Missing required fields: projectId, drawingId, or pages');
    }

    const parts: any[] = [
      {
        text: `You are a Quantity Surveyor AI assistant. Analyze the provided construction drawing images and OCR text.
Extract a fully priced Bill of Quantities (BOQ). Return a JSON object ONLY. Do not include markdown formatting or commentary.
The JSON must strictly match this structure:
{
  "constants": [
    { "name": "string", "value": number, "unit": "string", "description": "string" }
  ],
  "items": [
    {
      "category": "Substructure" | "Superstructure" | "Finishes" | "MEP",
      "description": "string",
      "nos": number,
      "length_m": number,
      "width_m": number,
      "height_m": number,
      "quantity": number,
      "unit": "string",
      "rate": number,
      "remarks": "string"
    }
  ]
}
For the "rate", provide a highly realistic estimated market rate (number only) for the item. Calculate "quantity" accurately based on the dimensions.`
      }
    ];
    
    // Process pages
    for (let i = 0; i < Math.min(pages.length, 10); i++) {
      const page = pages[i];
      parts.push({ text: `OCR Text for Page ${i + 1}:\n${page.ocrText}` });

      if (page.imageUrl) {
        const imageResp = await fetch(page.imageUrl);
        if (imageResp.ok) {
          const arrayBuffer = await imageResp.arrayBuffer();
          const base64Data = encode(new Uint8Array(arrayBuffer));
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          });
        }
      }
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const aiText = result.response.text();
    const parsedData = JSON.parse(aiText);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error(error);
    let errorMessage = error.message;
    
    // If it's a "model not found" error, try to fetch the list of available models
    if (errorMessage.includes("is not found") || errorMessage.includes("404")) {
      try {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const listData = await listRes.json();
        if (listData.models) {
          const modelNames = listData.models
            .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => m.name)
            .join(", ");
          errorMessage = `${errorMessage}\n\nAvailable models for your key: ${modelNames}`;
        }
      } catch (e) {
        // Ignore errors fetching model list
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
