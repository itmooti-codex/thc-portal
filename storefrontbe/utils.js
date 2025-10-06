const ONTRAPORT_BASE_URL =
  process.env.ONTRAPORT_BASE_URL || "https://api.ontraport.com/1";
const ONTRAPORT_APP_ID = process.env.ONTRAPORT_APP_ID;
const ONTRAPORT_API_KEY = process.env.ONTRAPORT_API_KEY;
const DUMMY_GATEWAY_ID = process.env.DUMMY_GATEWAY_ID || "1";

// Helper function to make Ontraport API calls
export const ontraportRequest = async (endpoint, options = {}) => {
  if (!ONTRAPORT_APP_ID || !ONTRAPORT_API_KEY) {
    throw new Error("Missing Ontraport credentials");
  }

  const url = `${ONTRAPORT_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "Api-Appid": ONTRAPORT_APP_ID,
    "Api-Key": ONTRAPORT_API_KEY,
    Accept: "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Ontraport API error: ${response.status} - ${JSON.stringify(data)}`
    );
  }

  return data;
};