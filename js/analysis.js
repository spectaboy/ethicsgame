function showLoadingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'loading-indicator';
  indicator.innerHTML = `
    <div class="spinner"></div>
    <p>Analyzing your decisions...</p>
  `;
  document.body.appendChild(indicator);
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.remove();
  }
}

export async function sendGameDataToMindStudio(gameData) {
  showLoadingIndicator();
  
  const API_URL = 'https://api.mindstudio.ai/developer/v2/workers/run';
  const API_KEY = 'skh9QtOgDcKAyGQ64qqi8Q2yeOIiaiycoec0Q8eQeagoEcIG0WAEugEaew6osWKSKOi8sagaCuIgWyCiIuaA4iYQ';
  const WORKER_ID = 'a1191662-0b61-4da9-a780-1d61f4635b9f';

  const payload = {
    workerId: WORKER_ID,
    variables: {
      gameData: JSON.stringify(gameData), // This is the fix from your working code.
    },
    workflow: 'Main.flow',
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('API Error Response:', errorBody);
      throw new Error(`API call failed with status ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Analysis received:', result);
    return result;
  } catch (error) {
    console.error('Error communicating with MindStudio API:', error);
    throw error;
  } finally {
    hideLoadingIndicator();
  }
} 