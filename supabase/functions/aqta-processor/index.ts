import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RuleEngine } from "./RuleEngine.ts";
import { QuantityEngine } from "./QuantityEngine.ts";
import { ValidationEngine } from "./ValidationEngine.ts";

console.log("AQTA Processor Function initialized!");

serve(async (req) => {
  try {
    const { record, type } = await req.json();

    if (type === "INSERT" && record && record.file_type === "input") {
      const fileId = record.id;
      const projectId = record.project_id;
      const companyId = record.company_id;
      const fileUrl = record.file_url;
      
      console.log(`Processing drawing [${fileId}] for project [${projectId}]...`);
      
      // Step 1: Parse the drawing deterministically (Vector parsing)
      // NOTE: AI Vision integration (OpenClaw) is completely commented out and disabled as requested.
      // We rely strictly on our deterministic Vector Parser for DXF/DWG files.
      
      /* 
      --- AI Integration Disabled ---
      const openClawNodes = await fetch("https://openclaw.gateway/api/parse", { ... })
      */
      
      // For now, we simulate receiving parsed vector geometry directly from our determinisic parser
      const parsedVectorNodes = []; 

      // Step 2: Pass vector nodes directly to Deterministic Engineering Engines
      const rulesAppliedNodes = RuleEngine.process(parsedVectorNodes);
      const quantifiedNodes = QuantityEngine.calculate(rulesAppliedNodes);
      
      // Step 3: Run Validation checks
      const validationReport = ValidationEngine.validate(quantifiedNodes);
      
      // Step 4: Save nodes into Supabase AQTA tables (aqta_elements, aqta_rooms, etc.)
      // using the Supabase Server Client (omitted in scaffold)
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "AQTA Pipeline Completed", 
        report: validationReport 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Ignored" }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
