// PM2 process file. Start with:  pm2 start ecosystem.config.js
// Two processes: the website (Nginx forwards the domain to 127.0.0.1:3100)
// and the worker that seals, grades and sends alerts.
module.exports = {
  apps: [
    {
      name: "prova-web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100 -H 127.0.0.1",
      instances: 1, // keep 1: rate limits live in this process's memory
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "768M",
      env: { NODE_ENV: "production" },
    },
    {
      name: "prova-worker",
      cwd: __dirname,
      script: "node_modules/.bin/tsx",
      args: "worker/index.ts",
      instances: 1, // must be exactly 1 so calls are never sealed twice
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 5000,
      max_memory_restart: "512M",
      env: { NODE_ENV: "production" },
    },
  ],
};
