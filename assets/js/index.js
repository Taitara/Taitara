async function cargarDatos() {
    try {
        const csvURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQyXC6GwAi6XiQM782lchykl-n0AOlb9Purnflp5SX_9mJOc9JORG2A-3CBWthXMAJdUNn7J6cT3fCP/pub?gid=0&single=true&output=csv";
        const proxyURL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(csvURL);

        const response = await fetch(proxyURL);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const csvData = await response.text();
        const rows = csvData.split(/\r?\n/).filter(row => row.trim() !== '');
        const productosContainer = document.getElementById('productos-container');

        // Agrupar productos por familia
        const familias = {};
        const todosLosProductos = []; // Para almacenar todos los productos

        rows.slice(1).forEach(row => {
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const familia = cols[1].replace(/^"|"$/g, '').trim();
            const producto = {
                id: cols[0].replace(/^"|"$/g, '').trim(),
                familia: familia,
                nombre: cols[2].replace(/^"|"$/g, '').trim(),
                descripcion: cols[3].replace(/^"|"$/g, '').trim(),
                precio: `$${parseInt(cols[4].replace(/^"|"$/g, '').trim())}`, // Quitar decimales
                cantidadVendida: parseInt(cols[5].replace(/^"|"$/g, '').trim()), // Leer cantidad vendida
                imagen: cols[6].replace(/^"|"$/g, '').trim() // Leer el nombre de la imagen
            };

            if (!familias[familia]) {
                familias[familia] = [];
            }
            familias[familia].push(producto);
            todosLosProductos.push(producto); // Agregar a la lista de todos los productos
        });

        // Mostrar los 3 productos más vendidos en el carrusel
        mostrarProductosMasVendidos(todosLosProductos);

        // Crear secciones para cada familia
        for (const familia in familias) {
            const familiaSection = document.createElement('div');
            familiaSection.className = 'familia-section';
            familiaSection.innerHTML = `
                <h3 class="familia-titulo">${familia} <span class="toggle-icon">+</span></h3>
                <div class="productos-grid" style="display: none;"></div>
            `;

            const productosGrid = familiaSection.querySelector('.productos-grid');
            familias[familia].forEach(producto => {
                const productoCard = document.createElement('div');
                productoCard.className = 'producto-card';
                productoCard.innerHTML = `
                    <p class="producto-id">Cod. Producto: ${producto.id}</p>
                    <img src="assets/img/${producto.imagen}" class="producto-imagen" alt="${producto.nombre}">
                    <h4 class="producto-nombre">${producto.nombre}</h4>
                    <p class="producto-descripcion">${producto.descripcion}</p>
                    <p class="producto-precio">${producto.precio}</p>
                `;
            
                // Agregar evento de clic para mostrar/ocultar la imagen
                productoCard.addEventListener('click', () => {
                    const imagen = productoCard.querySelector('.producto-imagen');
                    imagen.classList.toggle('visible'); // Alternar la visibilidad de la imagen
                });
            
                productosGrid.appendChild(productoCard);
            });

            // Agregar evento de clic al título de la familia
            const familiaTitulo = familiaSection.querySelector('.familia-titulo');
            familiaTitulo.addEventListener('click', () => {
                productosGrid.style.display = productosGrid.style.display === 'none' ? 'grid' : 'none';
                const toggleIcon = familiaTitulo.querySelector('.toggle-icon');
                toggleIcon.textContent = productosGrid.style.display === 'none' ? '+' : '-';
            });

            productosContainer.appendChild(familiaSection);
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Hubo un error al cargar los datos. Por favor, inténtalo de nuevo más tarde.');
    }
}

// Función para mostrar los 3 productos más vendidos en el carrusel
function mostrarProductosMasVendidos(productos) {
    const productosOrdenados = productos.sort((a, b) => b.cantidadVendida - a.cantidadVendida);
    const masVendidos = productosOrdenados.slice(0, 3);
    const carruselInner = document.querySelector('#carouselMasVendidos .carousel-inner');
    carruselInner.innerHTML = '';

    masVendidos.forEach((producto, index) => {
        const carruselItem = document.createElement('div');
        carruselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        carruselItem.innerHTML = `
            <div class="card">
                <img src="assets/img/${producto.imagen}" class="card-img-top" alt="${producto.nombre}">
                <div class="card-body">
                    <p class="producto-id">Cod. Producto: ${producto.id}</p>
                    <h6 class="producto-nombre">${producto.nombre}</h6>
                    <p class="fw-lighter fs-8 producto-descripcion">${producto.descripcion}</p>
                </div>
            </div>
        `;
        carruselInner.appendChild(carruselItem);
    });
}

// Iniciar carga de datos al cargar la página
document.addEventListener("DOMContentLoaded", cargarDatos);