(function(){
  const $ = (id)=>document.getElementById(id);
  function copy(text){ if(navigator.clipboard){ navigator.clipboard.writeText(text); } }

  const parts = location.pathname.split('/');
  const idOrHash = decodeURIComponent(parts[parts.length - 1] || '');

  async function load(){
    try{
      const res = await fetch(window.BACKEND_URL + `/api/certificados/public/${encodeURIComponent(idOrHash)}`);
      if(!res.ok) throw new Error();
      const c = await res.json();

      $('statusBadge').textContent = c.status || 'EMITIDO';
      $('statusBadge').className = 'badge rounded-pill ' + (c.status==='EMITIDO' ? 'text-bg-success' : 'text-bg-warning');

      $('alunoNome').textContent = c.aluno?.nome || '-';
      $('atividadeNome').textContent = c.atividade?.nome || '-';
      $('carga').textContent = (c.cargaHoraria || '-') + ' horas';
      $('data').textContent = c.data || '-';
      $('responsavel').textContent = c.responsavel?.nome || '-';

      $('id').textContent = c.id;
      $('hash').textContent = c.hash || '-';

      $('btnDownload').href = c.urlDownload;

      const ident = c.hash || c.id;
// Gerar QR Code no frontend
	      const link = location.origin + `/certificados/verificar/${encodeURIComponent(ident)}`;
	      const qrCanvas = document.createElement('canvas');
	      await QRCode.toCanvas(qrCanvas, link, {
	        errorCorrectionLevel: 'H',
	        margin: 1,
	        scale: 8
	      });
	      $('qr').src = qrCanvas.toDataURL();

      
      $('btnCopyLink').addEventListener('click', ()=> copy(link));
      $('btnCopyHash').addEventListener('click', ()=> c.hash && copy(c.hash));
    }catch(e){
      document.body.innerHTML = '<main class="bg"><div class="glass"><h2>Certificado não encontrado</h2><p class="muted">Verifique o código informado.</p></div></main>';
    }
  }
  load();
})();