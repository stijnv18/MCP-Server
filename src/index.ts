#!/usr/bin/env node

import { SimpleMcpServer } from './server.js';

// Run the server
const server = new SimpleMcpServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
