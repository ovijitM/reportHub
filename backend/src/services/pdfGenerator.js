import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use createRequire to load pdfmake's CJS module correctly
const require = createRequire(import.meta.url);
const pdfmake = require('pdfmake/js/index.js');

// Register Roboto fonts (stored in pdfmake/fonts/Roboto/)
pdfmake.addFonts({
  Roboto: {
    normal: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf')
  }
});

// Allow local filesystem access for font files; block remote URLs (fonts are local only)
pdfmake.setLocalAccessPolicy(() => true);
pdfmake.setUrlAccessPolicy(() => false); // No remote URLs needed

// Helper to generate the PDF buffer from a docDefinition
const buildPDFBuffer = async (docDefinition) => {
  const doc = pdfmake.createPdf(docDefinition);
  return await doc.getBuffer();
};

// Helper to get days in a month
const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

// Helper to format date as DD/MM/YYYY
const formatDateStr = (date) => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Helper for metadata header layout
const getMetadataHeader = (title, subtitle, staff, config, month, year) => {
  const monthName = monthNames[month - 1];
  return [
    { text: 'JUPITER HEALTH CARE & ALLEN PHARMA', style: 'companyHeader', alignment: 'center' },
    { text: title, style: 'sheetHeader', alignment: 'center' },
    { text: subtitle, style: 'sheetSubtitle', alignment: 'center', margin: [0, 2, 0, 15] },
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: [ { text: 'MPO Name: ', bold: true }, staff.name ] },
            { text: [ { text: 'Designation: ', bold: true }, 'Medical Promotion Officer' ] }
          ]
        },
        {
          width: '*',
          stack: [
            { text: [ { text: 'Area Name: ', bold: true }, config ? config.area : 'N/A' ] },
            { text: [ { text: 'Region Name: ', bold: true }, config ? config.region : 'N/A' ] }
          ]
        },
        {
          width: 'auto',
          stack: [
            { text: [ { text: 'Month: ', bold: true }, `${monthName} ${year}` ] },
            { text: [ { text: 'Print Date: ', bold: true }, formatDateStr(new Date()) ] }
          ],
          alignment: 'right'
        }
      ],
      margin: [0, 0, 0, 15],
      fontSize: 10
    }
  ];
};

// Helper for bottom signatures layout
const getSignaturesLayout = () => {
  return {
    columns: [
      {
        width: '*',
        stack: [
          { text: '', margin: [0, 40, 0, 0] },
          { text: '___________________________', alignment: 'center', bold: true },
          { text: 'MPO Field Staff Signature', alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] }
        ]
      },
      {
        width: '*',
        stack: [
          { text: '', margin: [0, 40, 0, 0] },
          { text: '___________________________', alignment: 'center', bold: true },
          { text: 'Supervising Manager Signature', alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] }
        ]
      }
    ],
    margin: [0, 20, 0, 0]
  };
};

// ==========================================
// 1. GENERATE SHEET 1: DAILY WORKS SHEET PDF
// ==========================================
export const generateDailyWorksPDF = async (staff, config, month, year, entries) => {
  const daysCount = getDaysInMonth(month, year);
  
  // Table headers
  const tableBody = [
    [
      { text: 'SL', style: 'tableHeader', alignment: 'center' },
      { text: 'Date', style: 'tableHeader', alignment: 'center' },
      { text: 'Morning Visit Market', style: 'tableHeader' },
      { text: 'Afternoon Visit Market', style: 'tableHeader' },
      { text: 'Doctors Visited', style: 'tableHeader', alignment: 'center' },
      { text: 'Rx Product Survey / Remarks', style: 'tableHeader' }
    ]
  ];

  let totalDocs = 0;

  // Build grid row for every single day of the month
  for (let day = 1; day <= daysCount; day++) {
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    const entry = entries.find(e => new Date(e.date).getUTCDate() === day);

    const dateStr = formatDateStr(currentDate);
    const morning = entry ? (entry.morningMarket || '') : '';
    const afternoon = entry ? (entry.afternoonMarket || '') : '';
    const qty = entry ? (entry.doctorVisitQuantity || 0) : 0;
    const survey = entry ? (entry.rxProductSurvey || '') : '';

    if (entry) {
      totalDocs += qty;
    }

    tableBody.push([
      { text: String(day), alignment: 'center', style: 'tableCell' },
      { text: dateStr, alignment: 'center', style: 'tableCell' },
      { text: morning, style: 'tableCell' },
      { text: afternoon, style: 'tableCell' },
      { text: entry ? String(qty) : '', alignment: 'center', style: 'tableCell' },
      { text: survey, style: 'tableCell' }
    ]);
  }

  // Footer Totals Row
  tableBody.push([
    { text: 'Total', colSpan: 4, bold: true, alignment: 'right', style: 'tableTotal' },
    {}, {}, {},
    { text: String(totalDocs), bold: true, alignment: 'center', style: 'tableTotal' },
    { text: '', style: 'tableTotal' }
  ]);

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 30],
    defaultStyle: { font: 'Roboto' },
    content: [
      ...getMetadataHeader('Daily Works Sheet', 'Sheet 1: Log morning/afternoon market visits and doctor counts', staff, config, month, year),
      {
        table: {
          headerRows: 1,
          widths: [25, 65, 130, 130, 60, '*'],
          body: tableBody
        },
        layout: {
          fillColor: (rowIndex) => {
            if (rowIndex === 0) return '#2F6D4F';
            if (rowIndex === tableBody.length - 1) return '#FAF7F0';
            return rowIndex % 2 === 0 ? '#FAF7F0' : null;
          }
        }
      },
      getSignaturesLayout()
    ],
    styles: {
      companyHeader: { fontSize: 14, bold: true, color: '#1F4D37' },
      sheetHeader: { fontSize: 12, bold: true, color: '#2F6D4F', margin: [0, 2, 0, 0] },
      sheetSubtitle: { fontSize: 9, italics: true, color: '#666' },
      tableHeader: { fontSize: 8, bold: true, color: 'white', margin: [0, 2, 0, 2] },
      tableCell: { fontSize: 8, margin: [0, 1.5, 0, 1.5] },
      tableTotal: { fontSize: 8, bold: true, margin: [0, 2, 0, 2] }
    }
  };

  return await buildPDFBuffer(docDefinition);
};

// ==========================================
// 2. GENERATE SHEET 2: ORDER & COLLECTION PDF
// ==========================================
export const generateDailyOrdersPDF = async (staff, config, month, year, entries) => {
  const daysCount = getDaysInMonth(month, year);

  // Table headers
  const tableBody = [
    [
      { text: 'SL', style: 'tableHeader', alignment: 'center' },
      { text: 'Date', style: 'tableHeader', alignment: 'center' },
      { text: 'Market / Village Name', style: 'tableHeader' },
      { text: 'Doctors Cost (TK)', style: 'tableHeader', alignment: 'right' },
      { text: 'Other Cost (TK)', style: 'tableHeader', alignment: 'right' },
      { text: 'Daily Order (TK)', style: 'tableHeader', alignment: 'right' },
      { text: 'Daily Collection (TK)', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  let totalDocsCost = 0;
  let totalOtherCost = 0;
  let totalOrder = 0;
  let totalCollection = 0;

  for (let day = 1; day <= daysCount; day++) {
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    const entry = entries.find(e => new Date(e.date).getUTCDate() === day);

    const dateStr = formatDateStr(currentDate);
    const market = entry ? (entry.market || '') : '';
    const docsCost = entry ? (entry.doctorsCost || 0) : 0;
    const otherCost = entry ? (entry.otherCost || 0) : 0;
    const order = entry ? (entry.dailyOrder || 0) : 0;
    const collection = entry ? (entry.dailyCollection || 0) : 0;

    if (entry) {
      totalDocsCost += docsCost;
      totalOtherCost += otherCost;
      totalOrder += order;
      totalCollection += collection;
    }

    tableBody.push([
      { text: String(day), alignment: 'center', style: 'tableCell' },
      { text: dateStr, alignment: 'center', style: 'tableCell' },
      { text: market, style: 'tableCell' },
      { text: entry && docsCost > 0 ? docsCost.toLocaleString() : '', alignment: 'right', style: 'tableCell' },
      { text: entry && otherCost > 0 ? otherCost.toLocaleString() : '', alignment: 'right', style: 'tableCell' },
      { text: entry && order > 0 ? order.toLocaleString() : '', alignment: 'right', style: 'tableCell' },
      { text: entry && collection > 0 ? collection.toLocaleString() : '', alignment: 'right', style: 'tableCell' }
    ]);
  }

  // Footer Totals Row
  tableBody.push([
    { text: 'Total', colSpan: 3, bold: true, alignment: 'right', style: 'tableTotal' },
    {}, {},
    { text: totalDocsCost > 0 ? totalDocsCost.toLocaleString() : '0', bold: true, alignment: 'right', style: 'tableTotal' },
    { text: totalOtherCost > 0 ? totalOtherCost.toLocaleString() : '0', bold: true, alignment: 'right', style: 'tableTotal' },
    { text: totalOrder > 0 ? totalOrder.toLocaleString() : '0', bold: true, alignment: 'right', style: 'tableTotal' },
    { text: totalCollection > 0 ? totalCollection.toLocaleString() : '0', bold: true, alignment: 'right', style: 'tableTotal' }
  ]);

  // Performance calculations
  const target = config ? (config.targetAmount || 0) : 0;
  const salary = config ? (config.perMonthSalary || 0) : 0;
  const hqDA = config ? (config.headQuarterDA || 0) : 0;
  const exDA = config ? (config.exQuarterDA || 0) : 0;
  
  const progressPct = target > 0 ? Math.min(100, (totalCollection / target) * 100) : 0;
  const variance = totalCollection - target;

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 30],
    defaultStyle: { font: 'Roboto' },
    content: [
      ...getMetadataHeader('Order & Collection Sheet', 'Sheet 2: Log sales collections, orders, and cost structures', staff, config, month, year),
      {
        table: {
          headerRows: 1,
          widths: [25, 65, '*', 80, 80, 85, 85],
          body: tableBody
        },
        layout: {
          fillColor: (rowIndex) => {
            if (rowIndex === 0) return '#2F6D4F';
            if (rowIndex === tableBody.length - 1) return '#FAF7F0';
            return rowIndex % 2 === 0 ? '#FAF7F0' : null;
          }
        }
      },
      {
        columns: [
          // {
          //   width: '60%',
          //   stack: [
          //     { text: 'FINANCIAL PERFORMANCE SUMMARY', style: 'sectionTitle', margin: [0, 10, 0, 5] },
          //     {
          //       table: {
          //         widths: [150, '*'],
          //         body: [
          //           [ { text: 'Monthly Target (TK):', bold: true }, { text: `${target.toLocaleString()}` } ],
          //           [ { text: 'Total Collections (TK):', bold: true }, { text: `${totalCollection.toLocaleString()}` } ],
          //           [ { text: 'Variance (TK):', bold: true }, { text: `${variance >= 0 ? '+' : ''}${variance.toLocaleString()}`, color: variance >= 0 ? '#2F6D4F' : '#B5502F' } ],
          //           [ { text: 'Target Progress (%):', bold: true }, { text: `${progressPct.toFixed(1)}%` } ]
          //         ]
          //       },
          //       layout: 'noBorders'
          //     }
          //   ]
          // },
          {
            width: '40%',
            stack: [
              { text: 'ALLOWANCE PROFILE (TK)', style: 'sectionTitle', margin: [0, 10, 0, 5] },
              {
                table: {
                  widths: [120, '*'],
                  body: [
                    [ { text: 'Basic Salary:', bold: true }, { text: `${salary.toLocaleString()}` } ],
                    [ { text: 'HQ Daily Allowance:', bold: true }, { text: `${hqDA.toLocaleString()} per day` } ],
                    [ { text: 'Ex-HQ Daily Allowance:', bold: true }, { text: `${exDA.toLocaleString()} per day` } ]
                  ]
                },
                layout: 'noBorders'
              }
            ]
          }
        ],
        fontSize: 9,
        margin: [0, 5, 0, 5]
      },
      getSignaturesLayout()
    ],
    styles: {
      companyHeader: { fontSize: 14, bold: true, color: '#1F4D37' },
      sheetHeader: { fontSize: 12, bold: true, color: '#2F6D4F', margin: [0, 2, 0, 0] },
      sheetSubtitle: { fontSize: 9, italics: true, color: '#666' },
      sectionTitle: { fontSize: 10, bold: true, color: '#2F6D4F' },
      tableHeader: { fontSize: 8, bold: true, color: 'white', margin: [0, 2, 0, 2] },
      tableCell: { fontSize: 8, margin: [0, 1.5, 0, 1.5] },
      tableTotal: { fontSize: 8, bold: true, margin: [0, 2, 0, 2] }
    }
  };

  return await buildPDFBuffer(docDefinition);
};

// ==========================================
// 3. GENERATE SHEET 3: FIELD VISITS PDF
// ==========================================
export const generateFieldVisitsPDF = async (staff, config, month, year, entries) => {
  const daysCount = getDaysInMonth(month, year);

  // Table headers (Double headers for clean grouping)
  const tableBody = [
    [
      { text: 'SL', style: 'tableHeader', alignment: 'center', rowSpan: 2 },
      { text: 'Date', style: 'tableHeader', alignment: 'center', rowSpan: 2 },
      { text: 'Name of Market', style: 'tableHeader', rowSpan: 2 },
      { text: 'Visits', style: 'tableHeader', colSpan: 2, alignment: 'center' },
      {},
      { text: 'Specialty Breakdown (Doctors Count)', style: 'tableHeader', colSpan: 6, alignment: 'center' },
      {}, {}, {}, {}, {},
      { text: 'Total Visits', style: 'tableHeader', alignment: 'center', rowSpan: 2 }
    ],
    [
      {}, {}, {},
      { text: 'Morn.', style: 'tableHeader', alignment: 'center' },
      { text: 'Even.', style: 'tableHeader', alignment: 'center' },
      { text: 'Gyn.', style: 'tableHeader', alignment: 'center' },
      { text: 'Med.', style: 'tableHeader', alignment: 'center' },
      { text: 'Ped.', style: 'tableHeader', alignment: 'center' },
      { text: 'Ortho.', style: 'tableHeader', alignment: 'center' },
      { text: 'Skin', style: 'tableHeader', alignment: 'center' },
      { text: 'GP/Oth', style: 'tableHeader', alignment: 'center' },
      {}
    ]
  ];

  let sumGyn = 0;
  let sumMed = 0;
  let sumPed = 0;
  let sumOrtho = 0;
  let sumSkin = 0;
  let sumGP = 0;
  let sumTotal = 0;
  let hasOverride = false;

  for (let day = 1; day <= daysCount; day++) {
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    const entry = entries.find(e => new Date(e.date).getUTCDate() === day);

    const dateStr = formatDateStr(currentDate);
    const market = entry ? (entry.market || '') : '';
    const morning = entry ? (entry.morningVisit || '') : '';
    const evening = entry ? (entry.eveningVisit || '') : '';
    const gyn = entry ? (entry.gynecologistQty || 0) : 0;
    const med = entry ? (entry.medicineQty || 0) : 0;
    const ped = entry ? (entry.pediatricQty || 0) : 0;
    const ortho = entry ? (entry.orthopaedicQty || 0) : 0;
    const skin = entry ? (entry.skinVdQty || 0) : 0;
    const gp = entry ? (entry.gpOthersQty || 0) : 0;
    const total = entry ? (entry.totalVisitQty || 0) : 0;

    if (entry) {
      sumGyn += gyn;
      sumMed += med;
      sumPed += ped;
      sumOrtho += ortho;
      sumSkin += skin;
      sumGP += gp;
      sumTotal += total;

      if (entry.totalVisitQtyOverridden) {
        hasOverride = true;
      }
    }

    const totalText = entry 
      ? (entry.totalVisitQtyOverridden ? `${total} *` : String(total))
      : '';

    tableBody.push([
      { text: String(day), alignment: 'center', style: 'tableCell' },
      { text: dateStr, alignment: 'center', style: 'tableCell' },
      { text: market, style: 'tableCell' },
      { text: morning, alignment: 'center', style: 'tableCell' },
      { text: evening, alignment: 'center', style: 'tableCell' },
      { text: entry && gyn > 0 ? String(gyn) : '', alignment: 'center', style: 'tableCell' },
      { text: entry && med > 0 ? String(med) : '', alignment: 'center', style: 'tableCell' },
      { text: entry && ped > 0 ? String(ped) : '', alignment: 'center', style: 'tableCell' },
      { text: entry && ortho > 0 ? String(ortho) : '', alignment: 'center', style: 'tableCell' },
      { text: entry && skin > 0 ? String(skin) : '', alignment: 'center', style: 'tableCell' },
      { text: entry && gp > 0 ? String(gp) : '', alignment: 'center', style: 'tableCell' },
      { text: totalText, alignment: 'center', style: 'tableCell', bold: entry && entry.totalVisitQtyOverridden }
    ]);
  }

  // Footer Totals Row
  tableBody.push([
    { text: 'Total', colSpan: 3, bold: true, alignment: 'right', style: 'tableTotal' },
    {}, {},
    { text: '', bold: true, alignment: 'center', style: 'tableTotal' },
    { text: '', bold: true, alignment: 'center', style: 'tableTotal' },
    { text: String(sumGyn), bold: true, alignment: 'center', style: 'tableTotal' },
    { text: String(sumMed), bold: true, alignment: 'center', style: 'tableTotal' },
    { text: String(sumPed), bold: true, alignment: 'center', style: 'tableTotal' },
    { text: String(sumOrtho), bold: true, alignment: 'center', style: 'tableTotal' },
    { text: String(sumSkin), bold: true, alignment: 'center', style: 'tableTotal' },
    { text: String(sumGP), bold: true, alignment: 'center', style: 'tableTotal' },
    { text: String(sumTotal), bold: true, alignment: 'center', style: 'tableTotal' }
  ]);

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [25, 30, 25, 30],
    defaultStyle: { font: 'Roboto' },
    content: [
      ...getMetadataHeader('Field Works Visit Sheet', 'Sheet 3: Log specialty doctor visits, morning/evening scope breakdown', staff, config, month, year),
      {
        table: {
          headerRows: 2,
          widths: [20, 52, '*', 38, 38, 28, 28, 28, 28, 28, 28, 38],
          body: tableBody
        },
        layout: {
          fillColor: (rowIndex) => {
            if (rowIndex === 0 || rowIndex === 1) return '#2F6D4F';
            if (rowIndex === tableBody.length - 1) return '#FAF7F0';
            return rowIndex % 2 === 0 ? '#FAF7F0' : null;
          }
        }
      },
      hasOverride ? {
        text: '* Indicates rows where the total visit quantity was overridden by the MPO field staff.',
        fontSize: 8,
        color: '#B5502F',
        margin: [0, 5, 0, 5],
        italics: true
      } : null,
      getSignaturesLayout()
    ],
    styles: {
      companyHeader: { fontSize: 14, bold: true, color: '#1F4D37' },
      sheetHeader: { fontSize: 12, bold: true, color: '#2F6D4F', margin: [0, 2, 0, 0] },
      sheetSubtitle: { fontSize: 9, italics: true, color: '#666' },
      tableHeader: { fontSize: 7, bold: true, color: 'white', margin: [0, 2, 0, 2] },
      tableCell: { fontSize: 7, margin: [0, 1.5, 0, 1.5] },
      tableTotal: { fontSize: 7, bold: true, margin: [0, 2, 0, 2] }
    }
  };

  return await buildPDFBuffer(docDefinition);
};
