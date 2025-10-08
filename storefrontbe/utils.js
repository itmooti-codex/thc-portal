import dotenv from 'dotenv'
import path from "path";


dotenv.config({ path: path.join("./", ".env") });


const ONTRAPORT_BASE_URL =
  process.env.ONTRAPORT_BASE_URL || "https://api.ontraport.com/1";
const ONTRAPORT_APP_ID = process.env.ONTRAPORT_APP_ID;
const ONTRAPORT_API_KEY = process.env.ONTRAPORT_API_KEY;
const DUMMY_GATEWAY_ID = process.env.DUMMY_GATEWAY_ID || "1";

// Helper function to make Ontraport API calls
export const ontraportRequest = async (endpoint, options = {}) => {
  // Read env at call-time; dotenv is loaded centrally in index.js
  const baseUrl = process.env.ONTRAPORT_BASE_URL || "https://api.ontraport.com/1";
  const appId = process.env.ONTRAPORT_APP_ID;
  const apiKey = process.env.ONTRAPORT_API_KEY;

  if (!appId || !apiKey) {
    throw new Error("Missing Ontraport credentials");
  }

  const url = `${baseUrl}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "Api-Appid": appId,
    "Api-Key": apiKey,
    Accept: "application/json",
    ...options.headers,
  };

  console.log(`[OP] ${options.method || 'GET'} ${url}`);
  if (options.body) {
    try { console.log('[OP] body:', options.body); } catch {}
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const dataText = await response.text().catch(() => "");
  let data;
  try { data = JSON.parse(dataText); } catch { data = dataText; }
  console.log(`[OP] ${response.status} ${url}`, typeof data === 'string' ? data : JSON.stringify(data).slice(0, 2000));

  if (!response.ok) {
    throw new Error(`Ontraport API error: ${response.status} - ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }

  return data;
};