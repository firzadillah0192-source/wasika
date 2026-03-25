module.exports = {
  apps: [{
    name: 'wasika',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    restart_delay: 3000,
    watch: false,
    autorestart: true,
    out_file: "./logs/pm2_out.log",
    error_file: "./logs/pm2_error.log",
    merge_logs: true
  }]
}
