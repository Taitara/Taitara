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
                
                // Verificar si la familia es "Promociones" para aplicar clase especial
                const esPromocion = familia.toLowerCase() === 'promociones';
                productoCard.className = esPromocion ? 'producto-card promocion-card' : 'producto-card';
                
                // Procesar descripción para promociones
                let descripcionHTML = producto.descripcion;
                if (esPromocion) {
                    if (descripcionHTML.includes('|')) {
                        // Dividir por | y procesar cada línea
                        const lineas = descripcionHTML.split('|');
                        descripcionHTML = lineas.map(linea => {
                            // Buscar texto antes de : y ponerlo en negrita
                            return linea.trim().replace(/^([^:]+)(:)/g, '<strong>$1</strong>$2');
                        }).join('<br>');
                    } else {
                        // Si no hay |, pero es promoción, buscar texto antes de : y ponerlo en negrita
                        descripcionHTML = descripcionHTML.replace(/^([^:]+)(:)/g, '<strong>$1</strong>$2');
                    }
                }
                
                productoCard.innerHTML = `
                    <p class="producto-id">Cod. Producto: ${producto.id}</p>
                    <img src="assets/img/${producto.imagen}" class="producto-imagen" alt="${producto.nombre}">
                    <h4 class="producto-nombre">${producto.nombre}</h4>
                    <p class="producto-descripcion ${esPromocion ? 'descripcion-promocion' : ''}">${descripcionHTML}</p>
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

document.getElementById('descargar-carta').addEventListener('click', generarPDF);

async function generarPDF() {
    // Inicialización de jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Variables de control de posición y layout
    let y = 30; // Posición vertical inicial
    const pageHeight = 280; // Altura útil de la página
    const margin = 20; // Margen izquierdo
    
    // Paleta de colores del diseño
    const esmeralda = [46, 139, 87];   // Color principal para títulos
    const dorado = [212, 175, 55];     // Color para headers de familia
    const salmon = [255, 111, 97];     // Color para precios
    const grayDark = [85, 85, 85];     // Color para texto secundario

    // === CREACIÓN DEL ENCABEZADO ===
    // Fondo verde esmeralda para el header
    doc.setFillColor(...esmeralda);
    doc.rect(0, 0, 210, 50, 'F'); // Rectángulo que cubre todo el ancho
    
    // Función que carga el logo de forma asíncrona
    const cargarLogo = () => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // Callback cuando el logo se carga correctamente
            img.onload = () => {
                try {
                    // Convertir imagen a canvas para obtener data URL
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imgData = canvas.toDataURL('image/png');
                    
                    // Calcular dimensiones y posición centrada del logo
                    const logoWidth = 60;
                    const logoHeight = (img.height / img.width) * logoWidth;
                    const logoX = (210 - logoWidth) / 2; // Centrado horizontal
                    const logoY = (50 - logoHeight) / 2;  // Centrado vertical en el header
                    
                    // Agregar logo al PDF
                    doc.addImage(imgData, 'PNG', logoX, logoY, logoWidth, logoHeight);
                    console.log("Logo agregado correctamente");
                    resolve();
                } catch (error) {
                    console.log("Error procesando logo:", error);
                    // Fallback: texto en lugar de logo
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(24);
                    doc.setFont('helvetica', 'bold');
                    doc.text("Taitara", 105, 25, { align: "center" });
                    resolve(); // Resolvemos aunque haya error
                }
            };
            
            // Callback si el logo no se puede cargar
            img.onerror = (error) => {
                console.log("Error cargando logo:", error);
                // Fallback: usar texto en lugar de imagen
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.text("Taitara", 105, 18, { align: "center" });
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                resolve(); // Resolvemos aunque haya error
            };
            
            // Configurar y cargar la imagen del logo
            img.crossOrigin = "anonymous"; // Para evitar problemas de CORS
            img.src = 'assets/img/logotaitara.png';
        });
    };
    
    // Función principal que genera el contenido del PDF
    const generarContenido = async () => {
        try {
            // === OBTENCIÓN DE DATOS CSV ===
            // URL del CSV público de Google Sheets
            const csvURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQyXC6GwAi6XiQM782lchykl-n0AOlb9Purnflp5SX_9mJOc9JORG2A-3CBWthXMAJdUNn7J6cT3fCP/pub?gid=0&single=true&output=csv";
            // Proxy para evitar problemas de CORS
            const proxyURL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(csvURL);
            
            // Fetch de los datos
            const response = await fetch(proxyURL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const csvData = await response.text();
            // Dividir por líneas y filtrar líneas vacías
            const rows = csvData.split(/\r?\n/).filter(row => row.trim() !== '');

            // === PROCESAMIENTO DE DATOS ===
            // Estructuras para agrupar productos por familia
            const familias = {};
            const ordenFamilias = []; // Mantiene el orden de aparición

            // Procesar cada fila del CSV (saltando el header)
            rows.slice(1).forEach(row => {
                // Parsear CSV respetando comillas
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const familia = cols[1].replace(/^"|"$/g, '').trim();
                
                // === FORMATEO DE PRECIOS ===
                // Obtener precio sin comillas
                const precioRaw = cols[4].replace(/^"|"$/g, '').trim();
                const precioNumero = parseFloat(precioRaw);
                
                // Formatear precio con separadores de miles chilenos
                const precioFormateado = isNaN(precioNumero) ? precioRaw : 
                    precioNumero % 1 === 0 ? 
                    `$${precioNumero.toLocaleString('es-CL')}` : 
                    `$${precioNumero.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

                // Crear objeto producto
                const producto = {
                    id: cols[0].replace(/^"|"$/g, '').trim(),
                    familia: familia,
                    nombre: cols[2].replace(/^"|"$/g, '').trim(),
                    descripcion: cols[3].replace(/^"|"$/g, '').trim(),
                    precio: precioFormateado
                };

                // Agrupar por familia
                if (!familias[familia]) {
                    familias[familia] = [];
                    ordenFamilias.push(familia);
                }
                familias[familia].push(producto);
            });

            // === GENERACIÓN DEL PDF ===
            // Establecer posición inicial después del header
            y = 65;
            
            // Iterar por cada familia de productos
            ordenFamilias.forEach((familia, familiaIndex) => {
                // Control de página para título de familia
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 30;
                }

                // === TÍTULO DE FAMILIA ===
                // Fondo dorado para el título
                doc.setFillColor(...dorado);
                doc.rect(margin, y - 4, 170, 10, 'F');
                
                // Texto del título de familia
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(familia.toUpperCase(), margin + 4, y + 1);
                
                y += 12; // Espacio después del título de familia

                // === PRODUCTOS DE LA FAMILIA ===
                familias[familia].forEach((prod, prodIndex) => {
                    // Procesar descripción para promociones en PDF
                    let descripcionPDF = prod.descripcion;
                    const esPromocion = familia.toLowerCase() === 'promociones';
                    
                    // Calcular espacio necesario para el producto
                    let espacioNecesario;
                    if (esPromocion && descripcionPDF.includes('|')) {
                        // Para promociones con múltiples líneas, calcular espacio extra
                        const lineasDescripcion = descripcionPDF.split('|').length;
                        espacioNecesario = 9 + (lineasDescripcion * 4); // Espacio base + líneas extra
                    } else {
                        espacioNecesario = prod.descripcion && prod.descripcion.trim() !== '' ? 12 : 9;
                    }
                    
                    // Control de página para productos
                    if (y > pageHeight - espacioNecesario) {
                        doc.addPage();
                        y = 30;
                    }

                    // === LÍNEA PRINCIPAL: ID, NOMBRE Y PRECIO ===
                    const idProducto = prod.id;
                    const nombreProducto = prod.nombre;
                    const precio = prod.precio;
                    
                    // ID del producto (pequeño y discreto)
                    doc.setTextColor(120, 120, 120);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.text(idProducto, margin, y);
                    
                    // Calcular posición del nombre después del ID
                    const anchoId = doc.getTextWidth(idProducto);
                    const xNombre = margin + anchoId + 3; // 3 puntos de separación
                    
                    // Nombre del producto
                    doc.setTextColor(...esmeralda);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(nombreProducto, xNombre, y);
                    
                    // === LÍNEA DE PUNTOS DE RELLENO ===
                    // Calcular espacio para los puntos
                    const anchoNombre = doc.getTextWidth(nombreProducto);
                    const anchoPrecio = doc.getTextWidth(precio);
                    const espacioDisponible = 170 - xNombre;
                    const espacioParaPuntos = espacioDisponible - anchoNombre - anchoPrecio - 5;
                    
                    // Generar puntos de relleno
                    const anchoPunto = doc.getTextWidth('.');
                    const cantidadPuntos = Math.floor(espacioParaPuntos / anchoPunto);
                    const puntos = '.'.repeat(Math.max(3, cantidadPuntos));
                    
                    // Dibujar puntos de relleno
                    doc.setTextColor(150, 150, 150);
                    const xPuntos = xNombre + anchoNombre + 2;
                    doc.text(puntos, xPuntos, y);
                    
                    // Precio alineado a la derecha
                    doc.setTextColor(...salmon);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text(precio, 170, y, { align: "right" });

                    // Espacio entre productos
                    y += 5; 

                    // === DESCRIPCIÓN DEL PRODUCTO ===
                    if (prod.descripcion && prod.descripcion.trim() !== '') {
                        doc.setTextColor(...grayDark);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'italic');
                        
                        if (esPromocion && descripcionPDF.includes('|')) {
                            // Para promociones, dividir por | y mostrar cada línea
                            const lineas = descripcionPDF.split('|');
                            lineas.forEach((linea, index) => {
                                const lineaLimpia = linea.trim();
                                
                                // Buscar texto antes de : para ponerlo en negrita
                                const colonIndex = lineaLimpia.indexOf(':');
                                if (colonIndex > 0) {
                                    const nombreSubProducto = lineaLimpia.substring(0, colonIndex);
                                    const restoTexto = lineaLimpia.substring(colonIndex);
                                    
                                    // Nombre del sub-producto en negrita
                                    doc.setFont('helvetica', 'bold');
                                    doc.text(nombreSubProducto, margin + 3, y);
                                    
                                    // Calcular posición para el resto del texto
                                    const anchoNombre = doc.getTextWidth(nombreSubProducto);
                                    
                                    // Resto del texto en cursiva normal
                                    doc.setFont('helvetica', 'italic');
                                    doc.text(restoTexto, margin + 3 + anchoNombre, y);
                                } else {
                                    // Si no hay :, texto normal
                                    doc.text(lineaLimpia, margin + 3, y);
                                }
                                y += 4; // Espacio entre líneas
                            });
                            y += 3; // Espacio después de todas las líneas
                        } else if (esPromocion) {
                            // Para promociones sin |, pero con :
                            const colonIndex = descripcionPDF.indexOf(':');
                            if (colonIndex > 0) {
                                const nombreSubProducto = descripcionPDF.substring(0, colonIndex);
                                const restoTexto = descripcionPDF.substring(colonIndex);
                                
                                // Nombre del sub-producto en negrita
                                doc.setFont('helvetica', 'bold');
                                doc.text(nombreSubProducto, margin + 3, y);
                                
                                // Calcular posición para el resto del texto
                                const anchoNombre = doc.getTextWidth(nombreSubProducto);
                                
                                // Resto del texto en cursiva normal
                                doc.setFont('helvetica', 'italic');
                                doc.text(restoTexto, margin + 3 + anchoNombre, y);
                            } else {
                                doc.text(descripcionPDF, margin + 3, y);
                            }
                            y += 7; // Espacio después de descripción
                        } else {
                            doc.text(descripcionPDF, margin + 3, y); // Indentado 3 puntos
                            y += 7; // Espacio después de descripción
                        }
                    } else {
                        y += 1; // Espacio mínimo si no hay descripción
                    }
                });
                y += 3; // Separación entre familias
            });

            // === FOOTER EN TODAS LAS PÁGINAS ===
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                
                // Línea decorativa dorada
                doc.setDrawColor(...dorado);
                doc.setLineWidth(1);
                doc.line(margin, 285, 190, 285);
                
                // Nombre del restaurante centrado
                doc.setTextColor(...grayDark);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text("Taitara", 105, 290, { align: "center" });
                
                // Número de página alineado a la derecha
                doc.text(`Página ${i} de ${totalPages}`, 190, 290, { align: "right" });
            }

            // === GUARDAR EL PDF ===
            // Esta línea ahora está al final del procesamiento completo
            doc.save('Carta_Taitara.pdf');
            console.log("PDF generado exitosamente");
            
        } catch (error) {
            console.error("Error generando el PDF:", error);
            alert("Hubo un error al generar el PDF. Intenta nuevamente.");
        }
    };

    // === FLUJO PRINCIPAL ===
    try {
        // 1. Primero cargar el logo
        await cargarLogo();
        
        // 2. Luego generar el contenido y guardar
        await generarContenido();
        
    } catch (error) {
        console.error("Error en el proceso de generación del PDF:", error);
        alert("Hubo un error al generar el PDF. Intenta nuevamente.");
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