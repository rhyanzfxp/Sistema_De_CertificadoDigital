import ngrok from 'ngrok';  
import { spawn } from 'child_process';

const PORT = 3000;

(async () => {
  console.log("⏳ Iniciando túnel Ngrok...");


  const url = await ngrok.connect(PORT);

  console.log(`✅ Túnel aberto: ${url}`);
  console.log(`🌍 BASE_URL_EXTERNA = ${url}`);


  const server = spawn("node", ["app.js"], {
    env: {
      ...process.env,
      BASE_URL_EXTERNA: url,  
    },
    stdio: "inherit",
    shell: true,
  });

 
  process.on("SIGINT", () => {
    console.log("\n🛑 Encerrando túnel e servidor...");
    ngrok.disconnect();  
    server.kill();
    process.exit(0);
  });
})();
