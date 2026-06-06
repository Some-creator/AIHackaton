const BASE_URL = 'http://localhost:3001/api';

async function post(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function testPipeline() {
  try {
    console.log('--- STEP 1: INGESTING WEBSITE (Agent 1) ---');
    const ingestResult = await post('/ingest', {
      url: 'https://lush-cafe.menu-world.com/',
      socialProfiles: []
    });
    console.log('Ingest Result (mock?):', ingestResult.mock);
    console.log('Business Profile:', JSON.stringify(ingestResult.business, null, 2));

    const context = {
      business: ingestResult.business,
      companyId: ingestResult.companyId,
      socialScrapes: ingestResult.socialScrapes || [],
    };

    console.log('\n--- STEP 2: RUNNING ANALYSIS (Agent 2) ---');
    const analysisResult = await post('/analyze', context);
    console.log('SWOT Analysis:', JSON.stringify(analysisResult.analysis, null, 2));
    context.analysis = analysisResult.analysis;

    console.log('\n--- STEP 3: RUNNING COMPETITOR BENCHMARK (Agent 3) ---');
    const benchmarkResult = await post('/benchmark', context);
    console.log('Competitors Discovered:', benchmarkResult.competitors.length);
    benchmarkResult.competitors.forEach((c, idx) => {
      console.log(`  ${idx + 1}. ${c.name} (${c.website})`);
      console.log(`     Target Market: ${c.targetMarket}`);
      console.log(`     They Have, You Don't:`, c.theyHaveYouDont);
    });
    context.competitors = benchmarkResult.competitors;

    console.log('\n--- STEP 4: RUNNING MARKET GAP (Agent 4) ---');
    const gapResult = await post('/gap', context);
    console.log('Market Gaps:', JSON.stringify(gapResult, null, 2));
    context.gaps = gapResult;
    context.recommendedGap = gapResult.recommendedGap;

    console.log('\n--- STEP 5: RUNNING LEAD GENERATION (Agent 5) ---');
    const sessionResult = await post('/leads/session', context);
    const { sessionId } = sessionResult;
    console.log(`Lead Session Created: ${sessionId}. Streaming leads...`);

    const streamUrl = `${BASE_URL}/leads/stream/${sessionId}`;
    const streamRes = await fetch(streamUrl);
    if (!streamRes.ok) {
      throw new Error(`Failed to connect to stream: ${streamRes.statusText}`);
    }

    // Read stream events
    let buffer = '';
    const decoder = new TextDecoder();
    for await (const chunk of streamRes.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep partial line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'lead') {
              console.log(`  [Lead]: ${data.lead.name} (${data.lead.priorityScore} priority) - Phone: ${data.lead.phone}, Coordinates: ${data.lead.lat}, ${data.lead.lng}`);
              console.log(`    Hook: ${data.lead.hook}`);
            } else {
              console.log(`  [Event]:`, data.type);
            }
          } catch (err) {
            console.log('Failed to parse line:', line);
          }
        }
      }
    }

    console.log('\nPipeline run completed successfully!');
  } catch (err) {
    console.error('Error running pipeline test:', err);
  }
}

testPipeline();
