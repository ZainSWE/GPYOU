fetch('dataset/gpuData.json')
  .then(res => res.json())
  .then(gpus => {
    const gallery = document.getElementById('gallery');
    gpus.forEach(gpu => {
      const div = document.createElement('div');
      div.className = 'gpu-card';
      div.innerHTML = `
        <model-viewer src="models/${gpu.Name}.glb" alt="${gpu.Name}" camera-controls disable-zoom></model-viewer>
        <div class="gpu-info">
          <h3>${gpu.Name}</h3>
          <div class="gpu-details">
            <p><strong>Memory:</strong> ${gpu.Memory}</p>
            <p><strong>Company:</strong> ${gpu.Company}</p>
            <p><strong>Date:</strong> ${gpu.Date}</p>
            <p><strong>Price:</strong> $${gpu.Price}</p>
            <p><strong>Performance:</strong> ${gpu.Performance}</p>
          </div>
        </div>
      `;
      gallery.appendChild(div);
    });
  });
