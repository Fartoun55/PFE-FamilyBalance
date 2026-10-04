const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { Document, Packer, Table, TableRow, TableCell, Paragraph } = require('docx');

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR');
};

const formatUserData = (users) => {
  return users.map((user) => ({
    'Prénom': user.firstName || '',
    'Nom': user.lastName || '',
    'Email': user.email || '',
    'Rôle': user.role || '',
    'Téléphone': user.phone || '',
    'Actif': user.isActive ? 'Oui' : 'Non',
    'Date Création': formatDate(user.createdAt),
    'Dernière Mise à Jour': formatDate(user.updatedAt),
  }));
};

const exportToExcel = (users) => {
  const data = formatUserData(users);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comptes');
  
  // Ajuste la largeur des colonnes
  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
  ];

  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
};

const exportToWord = async (users) => {
  const data = formatUserData(users);
  
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Prénom', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Nom', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Email', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Rôle', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Téléphone', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Actif', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Date de création', bold: true })] }),
      ],
    }),
  ];

  data.forEach((row) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(row['Prénom'])] }),
          new TableCell({ children: [new Paragraph(row['Nom'])] }),
          new TableCell({ children: [new Paragraph(row['Email'])] }),
          new TableCell({ children: [new Paragraph(row['Rôle'])] }),
          new TableCell({ children: [new Paragraph(row['Téléphone'])] }),
          new TableCell({ children: [new Paragraph(row['Actif'])] }),
          new TableCell({ children: [new Paragraph(row['Date Création'])] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Rapport de Comptes - FamilyBalance',
            heading: 'Heading1',
          }),
          new Paragraph({
            text: `Généré le ${formatDate(new Date())}`,
            alignment: 'right',
          }),
          new Paragraph({ text: '' }),
          new Table({
            rows: tableRows,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
};

const exportToPDF = (users) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 28,
        size: 'A4',
      });
      const buffers = [];

      doc.on('data', (chunk) => {
        buffers.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.on('error', reject);

      const data = formatUserData(users);
      const columns = ['Prénom', 'Nom', 'Email', 'Rôle', 'Téléphone', 'Actif'];
      const columnWidths = {
        'Prénom': 70,
        'Nom': 70,
        'Email': 165,
        'Rôle': 65,
        'Téléphone': 95,
        'Actif': 45,
      };
      const left = doc.page.margins.left;
      const top = doc.page.margins.top;
      const pageRight = doc.page.width - doc.page.margins.right;
      const rowHeight = 22;

      const drawReportHeader = () => {
        const titleY = top;
        const boxHeight = 64;

        doc.roundedRect(left, titleY, pageRight - left, boxHeight, 6).fillAndStroke('#F3F8FF', '#D4E3FF');

        doc.fillColor('#183B66').font('Helvetica-Bold').fontSize(16).text('FamilyBalance', left + 14, titleY + 12);

        doc
          .fillColor('#102A43')
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('Rapport des comptes utilisateurs', left + 14, titleY + 33);

        doc
          .fillColor('#334E68')
          .font('Helvetica')
          .fontSize(9)
          .text(`Date d'export: ${new Date().toLocaleString('fr-FR')}`, left + 14, titleY + 49);

        doc
          .fillColor('#334E68')
          .font('Helvetica')
          .fontSize(9)
          .text(`Total comptes: ${data.length}`, pageRight - 140, titleY + 49, { width: 126, align: 'right' });

        doc.fillColor('#000000');
        doc.y = titleY + boxHeight + 12;
      };

      const drawTableHeader = () => {
        const y = doc.y;
        doc.rect(left, y, pageRight - left, rowHeight).fill('#EAF2FF');

        let x = left;
        doc.fillColor('#102A43').font('Helvetica-Bold').fontSize(9);
        columns.forEach((col) => {
          doc.text(col, x + 6, y + 7, {
            width: columnWidths[col] - 10,
            align: 'left',
            ellipsis: true,
          });
          x += columnWidths[col];
        });

        doc.fillColor('#000000');
        doc.moveTo(left, y + rowHeight).lineTo(pageRight, y + rowHeight).strokeColor('#D9E2EC').lineWidth(1).stroke();
        doc.strokeColor('#000000');
        doc.y = y + rowHeight;
      };

      drawReportHeader();
      drawTableHeader();

      data.forEach((row, index) => {
        if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          drawReportHeader();
          drawTableHeader();
        }

        const rowY = doc.y;
        if (index % 2 === 0) {
          doc.rect(left, rowY, pageRight - left, rowHeight).fill('#FAFCFF');
        }

        let x = left;
        doc.fillColor('#243B53').font('Helvetica').fontSize(9);
        columns.forEach((col) => {
          doc.text(String(row[col] || '-'), x + 6, rowY + 7, {
            width: columnWidths[col] - 10,
            align: 'left',
            ellipsis: true,
          });
          x += columnWidths[col];
        });

        doc
          .moveTo(left, rowY + rowHeight)
          .lineTo(pageRight, rowY + rowHeight)
          .strokeColor('#E4E7EB')
          .lineWidth(0.6)
          .stroke();

        doc.fillColor('#000000');
        doc.strokeColor('#000000');
        doc.y = rowY + rowHeight;
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  exportToExcel,
  exportToWord,
  exportToPDF,
};
