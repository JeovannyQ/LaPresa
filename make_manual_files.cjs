const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const primaryColor = "990000";
const secondaryColor = "222222";

// Build DOCX Document
const doc = new Document({
  sections: [{
    properties: {},
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "🦅 CLUB GALLÍSTICO LA PRESA", bold: true, size: 36, color: primaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "MANUAL DE USUARIO Y GUÍA DE LA PÁGINA WEB", bold: true, size: 26, color: "333333", font: "Arial" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: "Guía de uso para la audiencia y operador del panel de transmisión", italic: true, size: 20, color: "666666", font: "Arial" })
        ]
      }),

      // Section 1 Header
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 150 },
        children: [
          new TextRun({ text: "1. Uso de la Página para la Audiencia / Espectadores", bold: true, size: 24, color: primaryColor, font: "Arial" })
        ]
      }),

      // 1.1
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "1.1 Ver la Transmisión en Vivo", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Ingrese a la página web desde cualquier celular, tablet o computadora.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Haga clic en el botón ", size: 20, font: "Arial" }),
          new TextRun({ text: "\"VER TRANSMISIÓN EN VIVO\"", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: " o baje a la sección de video principal.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "El reproductor iniciará la transmisión en vivo. En la esquina superior verá el aviso ", size: 20, font: "Arial" }),
          new TextRun({ text: "🔴 EN VIVO", bold: true, color: primaryColor, size: 20, font: "Arial" }),
          new TextRun({ text: " y la cantidad de espectadores conectados.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "Para ver a pantalla completa, toque el icono de expandir pantalla del reproductor.", size: 20, font: "Arial" })
        ]
      }),

      // 1.2
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "1.2 Consultar la Pizarra de Peleas en Tiempo Real", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "Justo debajo de la pantalla de video se encuentra la ", size: 20, font: "Arial" }),
          new TextRun({ text: "Pizarra en Vivo:", bold: true, size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Pelea Activa (En Ruedo): ", bold: true, color: primaryColor, size: 20, font: "Arial" }),
          new TextRun({ text: "Muestra el número de pelea actual, el peso oficial, el tiempo transcurrido y el enfrentamiento entre la Esquina Roja y la Esquina Azul (nombres de gallos, trabas y dueños).", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Resultados Anteriores: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Muestra la lista de peleas ya concluidas indicando el ganador (Rojo, Azul o Tablas) y la duración del combate.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "Próximas Peleas: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Permite ver la cartelera de los turnos siguientes programados para la jugada.", size: 20, font: "Arial" })
        ]
      }),

      // 1.3
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "1.3 Participar en el Chat en Vivo", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Ubique el panel de Chat en Vivo en la página.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Coloque su nombre o apodo gallero.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "Escriba su mensaje y toque Enviar para compartir comentarios con la afición en tiempo real.", size: 20, font: "Arial" })
        ]
      }),

      // 1.4
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "1.4 Ver Clips y Repeticiones de Peleas", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Vaya a la sección \"Momentos Destacados / Clips de Peleas\".", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "Haga clic sobre la miniatura para reproducir el clip de la pelea grabada en alta resolución.", size: 20, font: "Arial" })
        ]
      }),

      // Section 2 Header
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 150 },
        children: [
          new TextRun({ text: "2. Guía del Operador de la Página (Panel de Transmisión)", bold: true, size: 24, color: primaryColor, font: "Arial" })
        ]
      }),

      // 2.1
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "2.1 Abrir el Panel de Control", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Abra la página web en la computadora del operador.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "En el menú superior (arriba a la derecha), haga clic en el botón con el icono de ", size: 20, font: "Arial" }),
          new TextRun({ text: "Transmisión / Antena", bold: true, color: primaryColor, size: 20, font: "Arial" }),
          new TextRun({ text: ".", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "Se desplegará el Panel de Transmisión en el lado derecho de la pantalla.", size: 20, font: "Arial" })
        ]
      }),

      // 2.2
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "2.2 Iniciar y Detener la Transmisión", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Verificar Estado: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "En la parte superior del panel debe decir ", size: 20, font: "Arial" }),
          new TextRun({ text: "Servidor Online", bold: true, color: "008800", size: 20, font: "Arial" }),
          new TextRun({ text: " en color verde.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Iniciar Transmisión: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Haga clic en el botón verde \"Iniciar Transmisión\". El sistema comenzará a transmitir en vivo hacia la página.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "Detener Transmisión: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Al finalizar el evento del día, haga clic en el botón rojo \"Detener Transmisión\".", size: 20, font: "Arial" })
        ]
      }),

      // 2.3
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "2.3 Grabación de Clips de Peleas en Tiempo Real", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "Esta herramienta sirve para cortar y guardar la pelea de cada turno mientras la transmisión continúa:", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Cuando empiece una pelea: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Escriba el Número de Pelea (ej. 14), el título (ej. Pelea #14 - Traba El Roble vs Traba La Presa) y haga clic en \"Iniciar Grabación de Clip\".", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "Cuando termine la pelea: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Haga clic en \"Detener Clip\". El video se guardará automáticamente y estará disponible en los momentos destacados.", size: 20, font: "Arial" })
        ]
      }),

      // 2.4
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: "2.4 Ver, Descargar y Borrar Grabaciones", bold: true, size: 20, color: secondaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "En el panel lateral, abra la pestaña \"Grabaciones Almacenadas\".", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "👁️ Previsualizar: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Reproduce el video grabado en pantalla.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "⬇️ Descargar: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Guarda el video en la computadora.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 150 },
        children: [
          new TextRun({ text: "🗑️ Eliminar: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Borra grabaciones viejas si se requiere liberar espacio.", size: 20, font: "Arial" })
        ]
      }),

      // Section 3 Header
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 150 },
        children: [
          new TextRun({ text: "3. Consejos Rápidos y Recomendaciones", bold: true, size: 24, color: primaryColor, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Navegador Recomendado: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Utilice siempre Google Chrome para mayor estabilidad.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Antes de Iniciar: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Abra el panel de transmisión unos minutos antes para verificar que diga Servidor Online.", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "Recuerde los Clips: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: "Inicie y detenga la grabación al principio y final de cada pelea para mantener la página actualizada con las repeticiones.", size: 20, font: "Arial" })
        ]
      }),

      // Footer line
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({ text: "— Manual oficial de uso de la página web • Club Gallístico La Presa —", italic: true, size: 18, color: "888888", font: "Arial" })
        ]
      })
    ]
  }]
});

// Write Word File
Packer.toBuffer(doc).then(buffer => {
  const docxPath = path.join(__dirname, 'Manual_Usuario_LaPresa.docx');
  fs.writeFileSync(docxPath, buffer);
  console.log(`Word file generated successfully at: ${docxPath}`);
});

// Also create clean HTML file for PDF generation
const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual de Usuario - Club Gallístico La Presa</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #222; margin: 40px; }
    .header { text-align: center; border-bottom: 3px solid #990000; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #990000; margin-bottom: 5px; text-transform: uppercase; font-size: 26px; }
    h2 { color: #333; font-size: 18px; margin-top: 0; }
    .subtitle { color: #666; font-style: italic; font-size: 14px; }
    h3 { color: #990000; border-left: 4px solid #990000; padding-left: 10px; margin-top: 30px; font-size: 20px; }
    h4 { color: #222; margin-top: 20px; font-size: 16px; margin-bottom: 8px; }
    ul { margin-top: 5px; padding-left: 20px; }
    li { margin-bottom: 6px; }
    .badge { background: #990000; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 12px; }
    .badge-green { background: #008800; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 12px; }
    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🦅 Club Gallístico La Presa</h1>
    <h2>Manual de Usuario y Guía de la Página Web</h2>
    <div class="subtitle">Guía para espectadores y operador del panel de transmisión</div>
  </div>

  <h3>1. Uso de la Página para la Audiencia / Espectadores</h3>
  
  <h4>1.1 Ver la Transmisión en Vivo</h4>
  <ul>
    <li>Ingrese a la página web desde cualquier celular, tablet o computadora.</li>
    <li>Haga clic en el botón <strong>"VER TRANSMISIÓN EN VIVO"</strong> o baje a la sección de video principal.</li>
    <li>El reproductor iniciará la transmisión en vivo. En la esquina superior verá el aviso <span class="badge">🔴 EN VIVO</span> y la cantidad de espectadores conectados.</li>
    <li>Para ver a pantalla completa, toque el icono de expandir pantalla del reproductor.</li>
  </ul>

  <h4>1.2 Consultar la Pizarra de Peleas en Tiempo Real</h4>
  <p>Justo debajo de la pantalla de video se encuentra la <strong>Pizarra en Vivo</strong>:</p>
  <ul>
    <li><strong style="color:#990000;">Pelea Activa (En Ruedo):</strong> Muestra el número de pelea actual, el peso oficial, el tiempo transcurrido y el enfrentamiento entre la Esquina Roja y la Esquina Azul (nombres de gallos, trabas y dueños).</li>
    <li><strong>Resultados Anteriores:</strong> Muestra la lista de peleas ya concluidas indicando el ganador (Rojo, Azul o Tablas) y la duración del combate.</li>
    <li><strong>Próximas Peleas:</strong> Permite ver la cartelera de los turnos siguientes programados para la jugada.</li>
  </ul>

  <h4>1.3 Participar en el Chat en Vivo</h4>
  <ul>
    <li>Ubique el panel de Chat en Vivo en la página.</li>
    <li>Coloque su nombre o apodo gallero.</li>
    <li>Escriba su mensaje y toque Enviar para compartir comentarios con la afición en tiempo real.</li>
  </ul>

  <h4>1.4 Ver Clips y Repeticiones de Peleas</h4>
  <ul>
    <li>Vaya a la sección "Momentos Destacados / Clips de Peleas".</li>
    <li>Haga clic sobre la miniatura para reproducir el clip de la pelea grabada en alta resolución.</li>
  </ul>

  <h3>2. Guía del Operador de la Página (Panel de Transmisión)</h3>

  <h4>2.1 Abrir el Panel de Control</h4>
  <ul>
    <li>Abra la página web en la computadora del operador.</li>
    <li>En el menú superior (arriba a la derecha), haga clic en el botón con el icono de <strong style="color:#990000;">Transmisión / Antena</strong>.</li>
    <li>Se desplegará el Panel de Transmisión en el lado derecho de la pantalla.</li>
  </ul>

  <h4>2.2 Iniciar y Detener la Transmisión</h4>
  <ul>
    <li><strong>Verificar Estado:</strong> En la parte superior del panel debe decir <span class="badge-green">Servidor Online</span> en color verde.</li>
    <li><strong>Iniciar Transmisión:</strong> Haga clic en el botón verde "Iniciar Transmisión". El sistema comenzará a transmitir en vivo hacia la página.</li>
    <li><strong>Detener Transmisión:</strong> Al finalizar el evento del día, haga clic en el botón rojo "Detener Transmisión".</li>
  </ul>

  <h4>2.3 Grabación de Clips de Peleas en Tiempo Real</h4>
  <p>Esta herramienta sirve para cortar y guardar la pelea de cada turno mientras la transmisión continúa:</p>
  <ul>
    <li><strong>Cuando empiece una pelea:</strong> Escriba el Número de Pelea (ej. 14), el título (ej. Pelea #14 - Traba El Roble vs Traba La Presa) y haga clic en "Iniciar Grabación de Clip".</li>
    <li><strong>Cuando termine la pelea:</strong> Haga clic en "Detener Clip". El video se guardará automáticamente y estará disponible en los momentos destacados.</li>
  </ul>

  <h4>2.4 Ver, Descargar y Borrar Grabaciones</h4>
  <ul>
    <li>En el panel lateral, abra la pestaña "Grabaciones Almacenadas".</li>
    <li><strong>👁️ Previsualizar:</strong> Reproduce el video grabado en pantalla.</li>
    <li><strong>⬇️ Descargar:</strong> Guarda el video en la computadora.</li>
    <li><strong>🗑️ Eliminar:</strong> Borra grabaciones viejas si se requiere liberar espacio.</li>
  </ul>

  <h3>3. Consejos Rápidos y Recomendaciones</h3>
  <ul>
    <li><strong>Navegador Recomendado:</strong> Utilice siempre Google Chrome para mayor estabilidad.</li>
    <li><strong>Antes de Iniciar:</strong> Abra el panel de transmisión unos minutos antes para verificar que diga Servidor Online.</li>
    <li><strong>Recuerde los Clips:</strong> Inicie y detener la grabación al principio y final de cada pelea para mantener la página actualizada con las repeticiones.</li>
  </ul>

  <div class="footer">
    — Manual oficial de uso de la página web • Club Gallístico La Presa —
  </div>
</body>
</html>
`;

const htmlPath = path.join(__dirname, 'Manual_Usuario_LaPresa.html');
fs.writeFileSync(htmlPath, htmlContent);

// Generate PDF via Microsoft Edge CLI
const pdfPath = path.join(__dirname, 'Manual_Usuario_LaPresa.pdf');
const edgePath = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"`;
try {
  execSync(`${edgePath} --headless --print-to-pdf="${pdfPath}" "${htmlPath}"`);
  console.log(`PDF file generated successfully at: ${pdfPath}`);
} catch (err) {
  console.error("PDF generation error:", err);
}
