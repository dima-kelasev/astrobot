module.exports = {
  apps: [
    {
      name: 'astrobot',
      cwd: __dirname,
      script: 'server/dist/index.js',
      node_args: '--disable-warning=ExperimentalWarning',
      env: { NODE_ENV: 'production' }
    }
  ]
};
