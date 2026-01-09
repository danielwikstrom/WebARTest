import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { networkInterfaces } from 'os';

// Custom plugin to display IP address prominently
function displayNetworkIP() {
  return {
    name: 'display-network-ip',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          const interfaces = networkInterfaces();
          const ips = [];
          
          for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
              if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
              }
            }
          }
          
          if (ips.length > 0) {
            console.log('\n📱 Mobile Device Access:');
            ips.forEach(ip => {
              console.log(`   → https://${ip}:${port}`);
            });
            console.log('');
          }
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [basicSsl(), displayNetworkIP()],
  server: {
    https: true,
    host: true, // Allow external connections (for mobile testing)
    port: 5173
  },
  publicDir: 'public'
});

