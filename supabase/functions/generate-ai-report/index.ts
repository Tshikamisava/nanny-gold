import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, analyticsData, filters } = await req.json();

    console.log('Generating AI report with prompt:', prompt);

    // Prepare analytics summary for AI context
    const analyticsContext = `
Analytics Data Summary:
- Total Bookings: ${analyticsData.bookingsByMonth.reduce((sum: number, item: any) => sum + item.bookings, 0)}
- Total Revenue: R${analyticsData.revenueByMonth.reduce((sum: number, item: any) => sum + item.revenue, 0)}
- Active Nannies: ${analyticsData.nannyPerformance.length}
- Average Rating: ${(analyticsData.nannyPerformance.reduce((sum: number, nanny: any) => sum + nanny.rating, 0) / analyticsData.nannyPerformance.length || 0).toFixed(1)}

Booking Status Distribution:
${analyticsData.bookingStatus.map((status: any) => `- ${status.status}: ${status.count} (${status.percentage}%)`).join('\n')}

Top Performing Nannies:
${analyticsData.nannyPerformance.slice(0, 5).map((nanny: any, index: number) => 
  `${index + 1}. ${nanny.name} - Rating: ${nanny.rating}, Bookings: ${nanny.bookings}, Revenue: R${nanny.revenue}`
).join('\n')}

Geographic Distribution:
${analyticsData.geographicDistribution.map((region: any) => `- ${region.region}: ${region.count} (${region.percentage}%)`).join('\n')}

Applied Filters:
- Date Range: ${filters.dateRange.start || 'All'} to ${filters.dateRange.end || 'All'}
- Booking Type: ${filters.bookingType}
- Nanny Status: ${filters.nannyStatus}
- Service Type: ${filters.serviceType}
- Region: ${filters.region}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a business analytics expert specializing in the childcare/nanny service industry. Generate comprehensive, professional reports based on analytics data. Include insights, trends, recommendations, and actionable next steps. Format the report in a clear, structured manner suitable for business stakeholders.` 
          },
          { 
            role: 'user', 
            content: `${prompt}\n\nBased on the following analytics data:\n${analyticsContext}\n\nPlease generate a detailed report.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices[0].message.content;

    console.log('AI report generated successfully');

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Report generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});