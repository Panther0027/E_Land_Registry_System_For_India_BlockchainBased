import PDFDocument from 'pdfkit';

export const generateLandCertificate = (property, verifiedBy = null) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header band
    doc.rect(0, 0, 595, 80).fill('#1B4332');
    doc.fillColor('#D4A017').fontSize(28).font('Helvetica-Bold')
      .text('BHUMI', 50, 25, { continued: true })
      .fillColor('#FFFFFF').text('  Land Registry Certificate', { continued: false });
    doc.fillColor('#D4A017').fontSize(10).font('Helvetica')
      .text('Government of India — Blockchain Verified Land Record', 50, 55);

    doc.moveDown(3);
    doc.fillColor('#1B4332').fontSize(18).font('Helvetica-Bold')
      .text('Certificate of Land Ownership', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
      .text('This certificate confirms the registered ownership of the property listed below,', { align: 'center' })
      .text('as recorded on the Bhumi blockchain land registry.', { align: 'center' });

    doc.moveDown(2);
    const drawField = (label, value, y) => {
      doc.fillColor('#6B7280').fontSize(9).font('Helvetica-Bold').text(label, 50, y);
      doc.fillColor('#1A1A1A').fontSize(12).font('Helvetica').text(value || '—', 50, y + 14);
    };

    drawField('PROPERTY ID', property.propertyId, 160);
    drawField('SURVEY NUMBER', property.surveyNumber, 210);
    drawField('OWNER NAME', property.ownerName, 260);
    drawField('LOCATION', `${property.district}, ${property.state} — ${property.pincode}`, 310);
    drawField('LAND AREA', `${property.area?.toLocaleString('en-IN')} sq.ft`, 360);
    drawField('LAND TYPE', property.landType?.charAt(0).toUpperCase() + property.landType?.slice(1), 410);
    drawField('STATUS', property.status?.toUpperCase(), 460);

    if (property.transactionHash) {
      drawField('BLOCKCHAIN TX HASH', property.transactionHash, 510);
    }

    doc.moveDown(6);
    doc.rect(50, 560, 495, 1).fill('#D4A017');

    doc.fillColor('#6B7280').fontSize(9).font('Helvetica')
      .text(`Verified by: ${verifiedBy?.fullName || 'Bhumi Registry Authority'}`, 50, 575)
      .text(`Issue Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 590)
      .text(`Verification URL: https://bhumi.gov.in/verify/${property.propertyId}`, 50, 605);

    doc.fillColor('#1B4332').fontSize(8).font('Helvetica')
      .text('This is a digitally generated certificate. Verify authenticity at bhumi.gov.in/verify', 50, 750, { align: 'center' })
      .text('Powered by Ethereum Blockchain • IPFS Document Storage', 50, 762, { align: 'center' });

    doc.end();
  });
};
