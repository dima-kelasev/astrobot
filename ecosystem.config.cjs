const { existsSync } = require('node:fs');

// Сертификат Минцифры для API MAX (см. DEPLOY.md, раздел «MAX»).
const mincifraCert = '/usr/local/share/ca-certificates/mincifra-root.crt';

module.exports = {
  apps: [
    {
      name: 'astrobot',
      cwd: __dirname,
      script: 'server/dist/index.js',
      node_args: '--disable-warning=ExperimentalWarning',
      env: {
        NODE_ENV: 'production',
        ...(existsSync(mincifraCert) ? { NODE_EXTRA_CA_CERTS: mincifraCert } : {})
      }
    }
  ]
};
