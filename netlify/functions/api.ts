// This is the full content for: netlify/functions/api.ts

import serverless from "serverless-http";

// Use the project server entry so the module can be resolved by TypeScript.
import { createServer } from "./server/main";

// Create the app and export the Netlify handler
const app = createServer();
export const handler = serverless(app);