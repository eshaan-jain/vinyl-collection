// Load variables from a local .env file (Node 20.12+). Silently does nothing if there is no .env,
// e.g. in GitHub Actions where values come from secrets instead.
try { process.loadEnvFile(".env"); } catch { /* no .env file */ }
