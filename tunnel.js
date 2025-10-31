import localtunnel from "localtunnel";
import { spawn } from "child_process";

const PORT = 3000;

(async () => {
  console.log("⏳ Iniciando túnel LocalTunnel...");

  
  const tunnel = await localtunnel({ port: PORT });

  console.log(`✅ Túnel aberto: ${tunnel.url}`);
  console.log(`🌍 BASE_URL_EXTERNA = ${tunnel.url}`);

 
  const server = spawn("node", ["app.js"], {
    env: {
      ...process.env,
      BASE_URL_EXTERNA: tunnel.url,
    },
    stdio: "inherit",
    shell: true,
  });

  
  process.on("SIGINT", () => {
    console.log("\n🛑 Encerrando túnel e servidor...");
    tunnel.close();
    server.kill();
    process.exit(0);
  });
})();
