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
                cantidadVendida: parseInt(cols[5].replace(/^"|"$/g, '').trim()) // Leer cantidad vendida
            };

            if (!familias[familia]) {
                familias[familia] = [];
            }
            familias[familia].push(producto);
            todosLosProductos.push(producto); // Agregar a la lista de todos los productos
        });

        // Mostrar los 3 productos más vendidos en las tarjetas
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
                    <p class="producto-id">ID: ${producto.id}</p>
                    <h4 class="producto-nombre">${producto.nombre}</h4>
                    <p class="producto-descripcion">${producto.descripcion}</p>
                    <p class="producto-precio">${producto.precio}</p>
                    <p class="producto-cantidad">Vendidos: ${producto.cantidadVendida}</p>
                `;
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

// Función para mostrar los 3 productos más vendidos
function mostrarProductosMasVendidos(productos) {
    // Ordenar productos por cantidad vendida (de mayor a menor)
    const productosOrdenados = productos.sort((a, b) => b.cantidadVendida - a.cantidadVendida);

    // Tomar los 3 primeros
    const masVendidos = productosOrdenados.slice(0, 3);

    // Actualizar las tarjetas de "Destacados de la semana"
    const tarjetas = document.querySelectorAll('.cartas .card');
    tarjetas.forEach((tarjeta, index) => {
        if (masVendidos[index]) {
            const producto = masVendidos[index];
            tarjeta.querySelector('h6').textContent = producto.nombre;
            tarjeta.querySelector('p').textContent = producto.descripcion;
        }
    });
}

// Iniciar carga de datos al cargar la página
document.addEventListener("DOMContentLoaded", cargarDatos);







// Función para mostrar errores en los formularios
function mostrarError(id, mensaje) {
    const elemento = document.getElementById(id);
    elemento.textContent = mensaje;
    elemento.style.display = "block";
}

// Validación del formulario de contacto
const form1 = document.getElementById("formulario");
form1.addEventListener("submit", function (event) {
    event.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const motivo = document.getElementById("motivo").value.trim();
    const mensaje = document.getElementById("mensaje").value.trim();

    // Validar nombre
    if (nombre === "") {
        mostrarError("alerta-nombre", "El campo 'Nombre' es obligatorio.");
        return;
    }

    // Validar correo
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoRegex.test(correo)) {
        mostrarError("alerta-correo", "Por favor, ingresa un correo electrónico válido.");
        return;
    }

    // Validar teléfono
    const telefonoRegex = /^\d{9}$/;
    if (!telefonoRegex.test(telefono)) {
        mostrarError("alerta-telefono", "El teléfono debe tener 9 dígitos.");
        return;
    }

    // Validar motivo
    if (motivo === "") {
        mostrarError("alerta-motivo", "El campo 'Motivo de consulta' es obligatorio.");
        return;
    }

    // Validar mensaje
    if (mensaje === "") {
        mostrarError("alerta-mensaje", "El campo 'Mensaje' es obligatorio.");
        return;
    }

    // Si todo está correcto
    alert(`Muchas gracias, ${nombre}. Hemos recibido tu sugerencia y enviaremos una pronta respuesta al correo ${correo}.`);
    form1.reset();
});

// Mostrar/ocultar formularios
const comuniquemonosLink = document.getElementById('comuniquemonos-link');
const reservaLink = document.getElementById('reserva-link');
const formulario = document.querySelector('.contenedor');
const formularioReserva = document.querySelector('.contenedor2');

comuniquemonosLink.addEventListener('click', (event) => {
    event.preventDefault();
    formulario.classList.toggle('d-none');
    formularioReserva.classList.add('d-none'); // Ocultar el otro formulario
});

reservaLink.addEventListener('click', (event) => {
    event.preventDefault();
    formularioReserva.classList.toggle('d-none');
    formulario.classList.add('d-none'); // Ocultar el otro formulario
});

// Manejo del popup
document.getElementById('sobrenosotros-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('popup-container').style.display = 'block';
});

document.getElementById('cerrar-popup').addEventListener('click', () => {
    document.getElementById('popup-container').style.display = 'none';
});

// Manejo de la reserva
document.getElementById('botondereserva').addEventListener('click', () => {
    const nombre = document.getElementById('inputEmail4').value;
    const correo = document.getElementById('inputPassword4').value;
    const telefono = document.getElementById('inputCity').value;
    const fecha = document.getElementById('dateInput').value;
    const hora = document.getElementById('horaInput').value;
    const asistentes = document.getElementById('validationCustom04').value;

    if (!nombre || !correo || !telefono || !fecha || !hora || !asistentes) {
        alert("Por favor, complete todos los campos antes de enviar la reserva.");
        return;
    }

    alert(`Estimado/a ${nombre}, agradecemos reservar con nosotros. Hemos registrado ${asistentes} asistentes. Se ha enviado el código de confirmación al correo ${correo}. Gracias por su preferencia.`);
});

// Interacción con las tarjetas
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        card.classList.add('show-popup');
        const closePopup = document.createElement('div');
        closePopup.className = 'close-popup';
        closePopup.textContent = 'x';
        card.appendChild(closePopup);
    });
});

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('close-popup')) {
        const card = event.target.closest('.card');
        card.classList.remove('show-popup');
        event.target.remove();
    }
});