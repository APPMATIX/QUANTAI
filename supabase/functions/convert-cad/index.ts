import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CLOUDCONVERT_API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName } = await req.json();

    if (!CLOUDCONVERT_API_KEY) {
      throw new Error('CLOUDCONVERT_API_KEY is not configured.');
    }

    // Step 1: Create a CloudConvert Job
    const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-my-file': {
            operation: 'import/url',
            url: fileUrl
          },
          'convert-my-file': {
            operation: 'convert',
            input: 'import-my-file',
            output_format: 'pdf'
          },
          'export-my-file': {
            operation: 'export/url',
            input: 'convert-my-file'
          }
        }
      })
    });

    const jobData = await jobRes.json();
    if (!jobRes.ok) {
      throw new Error(jobData.message || JSON.stringify(jobData));
    }

    if (!jobData.data || !jobData.data.id) {
      throw new Error('Unexpected response format from CloudConvert: ' + JSON.stringify(jobData));
    }

    const jobId = jobData.data.id;

    // Step 2: Poll CloudConvert until job is finished
    let exportTask: any = null;
    while (true) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` }
      });
      const statusData = await statusRes.json();
      
      if (statusData.data.status === 'finished') {
        exportTask = statusData.data.tasks.find((t: any) => t.name === 'export-my-file');
        break;
      } else if (statusData.data.status === 'error') {
        throw new Error('CloudConvert Job Failed');
      }
    }

    if (!exportTask || !exportTask.result || !exportTask.result.files[0]) {
      throw new Error('Failed to retrieve converted PDF URL');
    }

    const pdfUrl = exportTask.result.files[0].url;

    // Return the converted PDF URL back to the client
    return new Response(JSON.stringify({ pdfUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
