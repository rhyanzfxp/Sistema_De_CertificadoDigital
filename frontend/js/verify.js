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

     
      const btnRevogar = $('btnRevogar');
      if (c.status !== 'REVOGADO') {
        btnRevogar.style.display = 'inline-block';
        btnRevogar.addEventListener('click', async () => {
          if (confirm('Tem certeza que deseja revogar este certificado? Esta ação é irreversível.')) {
            try {
              const revogarRes = await fetch(window.BACKEND_URL + `/api/certificados/${c.id}/revogar`, { method: 'POST' });
              if (revogarRes.ok) {
                alert('Certificado revogado com sucesso!');
                load(); 
              } else {
                const errData = await revogarRes.json();
                alert(`Falha ao revogar: ${errData.error || 'Erro desconhecido'}`);
              }
            } catch (e) {
              alert('Erro de conexão ao tentar revogar.');
            }
          }
        });
      } else {
        btnRevogar.style.display = 'none';
      }

      $('statusBadge').textContent = c.status || 'EMITIDO';
      let badgeClass = 'text-bg-warning';
      if (c.status === 'EMITIDO') {
        badgeClass = 'text-bg-success';
      } else if (c.status === 'REVOGADO') {
        badgeClass = 'text-bg-danger';
      }
      $('statusBadge').className = 'badge rounded-pill ' + badgeClass;

      $('alunoNome').textContent = c.aluno?.nome || '-';
      $('atividadeNome').textContent = c.atividade?.nome || '-';
      $('carga').textContent = (c.cargaHoraria || '-') + ' horas';
      $('data').textContent = c.data || '-';
      $('responsavel').textContent = c.responsavel?.nome || '-';

      $('id').textContent = c.id;
      $('hash').textContent = c.hash || '-';

      $('btnDownload').href = c.urlDownload;

      const ident = c.hash || c.id;

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