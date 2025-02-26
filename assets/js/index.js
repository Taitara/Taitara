const comuniquemonosLink = document.getElementById('comuniquemonos-link');
const formulario = document.querySelector('.contenedor');

comuniquemonosLink.addEventListener('click', (event) => {
    event.preventDefault();
    formulario.classList.toggle('d-none');
});


const form1 = document.getElementById("formulario");
form1.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevenir el envío del formulario

    const nombre = document.getElementById("nombre").value;
    const correo = document.getElementById("correo").value;
    const telefono = document.getElementById("telefono").value;

    if (nombre === "") {
        alert("El campo 'Nombre' es obligatorio");
        return;
    }

    const correoRegex = /^[^@]+@[^@]+\.[a-zA-Z]{2,}$/;
    if (!correoRegex.test(correo)) {
        alert("Por favor ingrese un correo electrónico válido.");
        return;
    }

    if (telefono.length !== 9) {
        alert("Por favor ingrese un número de teléfono válido.");
        return;
    }

    alert(`Muchas Gracias ${nombre} hemos recibido su sugerencia y enviaremos una pronta respuesta al correo ${correo}`);

    form1.reset();
});

const reservaLink = document.getElementById('reserva-link');
const formularioReserva = document.querySelector('.contenedor2');

reservaLink.addEventListener('click', (event) => {
    event.preventDefault();
    formularioReserva.classList.toggle('d-none');
});



$("#botondereserva").click(function () {
    let nombre = $("#inputEmail4").val();
    let correo = $("#inputPassword4").val();
    let telefono = $("#inputCity").val();
    let fecha = $("#dateInput").val();
    let hora = $("#horaInput").val();
    let asistentes = $("#validationCustom04").val();

    // Validar que todos los campos estén llenos
    if (nombre === "" || correo === "" || telefono === "" || fecha === "" || hora === "" || asistentes === "") {
        alert("Por favor, complete todos los campos antes de enviar la reserva.");
        return;
    }

    // Realizar la reserva
    alert("Estimado/a " + nombre + " agradecemos reservar con nosotros. Hemos registrado " + asistentes + " asistentes. Se ha enviado el código de confirmación al correo " + correo + "\nGracias por su preferencia");
});

$(document).ready(function () {
    $('.card').click(function () {
        $(this).addClass('show-popup');
        $(this).append('<div class="close-popup">x</div>');
    });

    $(document).on('click', '.close-popup', function () {
        $('.card').removeClass('show-popup');
        $('.close-popup').remove();
    });


    
    $('#sobrenosotros-link').click(function (e) {
        e.preventDefault();
        $('#popup-container').fadeIn();
    });
    
    $('#cerrar-popup').click(function () {
        $('#popup-container').fadeOut();
    });
});
