import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are AI Farm Assistant, an expert AI specialized in comprehensive farm management and cattle breeding. You help farmers with:

**Heat Detection & Breeding:**
- Interpreting sensor data from activity sensors, pedometers, neck collars, ear tags
- Body temperature monitoring (vaginal, rumen bolus sensors)
- Mounting behavior detection (pressure sensors, tail-head sensors, heat-mount patches)
- Rumination patterns and milk progesterone analysis
- Optimal breeding timing recommendations

**Cattle Health & Nutrition:**
- Feed management and nutrition planning
- Health monitoring and disease prevention
- Vaccination schedules and veterinary care
- Weight management and growth tracking

**Farm Operations:**
- Staff management and task scheduling
- Stock/inventory management for feed and supplies
- Equipment maintenance reminders
- Cost optimization and budgeting

**Breeding & Genetics:**
- Breeding strategies and genetic selection
- Pregnancy monitoring and calving guidance
- Herd genetics improvement
- Record keeping best practices

Be helpful, practical, and concise. Provide actionable advice based on sensor data when available. Use simple language that farmers can understand. When discussing sensors, explain what the readings mean and what actions to take.`
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
