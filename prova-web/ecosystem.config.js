// PM2 process file. Start with:  pm2 start ecosystem.config.js
// The site listens on 127.0.0.1:3100 and Nginx forwards the domain to it.
module.exports = {
  apps: [
    {
      name: "prova-web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100 -H 127.0.0.1",
      instances: 1, // keep 1: the waitlist rate limit lives in this process's memory
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
