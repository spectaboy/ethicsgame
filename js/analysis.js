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
  const API_URL = 'https://api.mindstudio.ai/v1/app/9oe2dd1b2553';
  const API_KEY = 'sk-aAYmK17711N2z4N1nN3g6Y9F9Fm7y5i2eE8f9D5d0B4X3';

  const payload = {
    "inputs": {
      "Game Data": JSON.stringify(gameData, null, 2)
    }
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
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('There was a problem with your fetch operation:', error);
    throw error;
  } finally {
    hideLoadingIndicator();
  }
} 