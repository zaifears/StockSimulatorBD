// lib/utils/pdfGenerator.ts
// Production-Ready Client-Side DSE Portfolio Statement PDF Generator
// Matches the official DSE XBroker / NBL Securities statement layout
// 100% Client-Side generation — 0 server resources consumed

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PortfolioItem, Stock } from '@/hooks/useSimulator';
import type { PortfolioTotals } from '@/lib/utils/portfolio';

export interface StatementTicket {
  ticketId: string;
  clientCode: string;
  boId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  dhakaTimeStr: string;
}

export interface StatementData {
  ticket: StatementTicket;
  totals: PortfolioTotals;
  portfolio: PortfolioItem[];
  stockBySymbol: Map<string, Stock>;
  balance: number;
  realizedGainLoss: number;
}

const fmt = (n: number, dp = 2) =>
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const signed = (n: number) => `${n >= 0 ? '+' : ''}${fmt(n, 2)}`;

/**
 * Loads an image from URL and converts to base64 for jsPDF
 */
async function getBase64Image(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generates and downloads the official DSE Portfolio Statement PDF
 */
export async function generatePortfolioPdf(data: StatementData) {
  const { ticket, totals, portfolio, stockBySymbol, balance, realizedGainLoss } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 14;
  const rightMargin = pageWidth - 14;
  let currentY = 12;

  // 1. BRAND HEADER SECTION
  const logoBase64 = await getBase64Image('/favicon-96x96.png');
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', leftMargin, currentY, 13, 13);
  }

  // Company info next to logo — strictly "StockSimulatorBD" and small description
  const textLeft = logoBase64 ? leftMargin + 16 : leftMargin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('StockSimulatorBD', textLeft, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Risk-Free Dhaka Stock Exchange (DSE) Paper Trading Platform', textLeft, currentY + 8.2);
  doc.text('Email: shahoriar.hossain@gmail.com | Website: www.stocksimulator.tech', textLeft, currentY + 12);

  // Right-aligned Statement Title & Date
  // Formats date cleanly like "11-Sep-2026"
  const dateParts = ticket.dhakaTimeStr.split(' ');
  const fullDateStr = dateParts.length >= 3 ? `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}` : dateParts[0];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Portfolio Statement  ${fullDateStr}`, rightMargin, currentY + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Doc ID: ${ticket.ticketId}`, rightMargin, currentY + 8.2, { align: 'right' });
  doc.text('Tier: BOSS TIER (ACTIVE)', rightMargin, currentY + 12, { align: 'right' });

  currentY += 16;

  // Horizontal divider rule
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(leftMargin, currentY, rightMargin, currentY);
  currentY += 4;

  // 2. CLIENT / TRADER BIO BLOCK (Client Code: XXXX, BO ID: UID)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  const col1KeyX = leftMargin;
  const col1ValX = leftMargin + 26;
  const col2KeyX = leftMargin + 105;
  const col2ValX = leftMargin + 138;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Name', col1KeyX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`:  ${ticket.userName}`, col1ValX - 4, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('Account Type', col2KeyX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(':  Individual (Paper Trading)', col2ValX - 4, currentY);
  currentY += 4;

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Client Code', col1KeyX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(':  XXXX', col1ValX - 4, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('Account Status', col2KeyX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(':  Active', col2ValX - 4, currentY);
  currentY += 4;

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('BO ID', col1KeyX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`:  ${ticket.boId}`, col1ValX - 4, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('Account Category', col2KeyX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(':  CASH', col2ValX - 4, currentY);
  currentY += 5;

  // 3. INSTRUMENT HOLDINGS TABLE (DSE Table Layout)
  const holdingsRows: any[] = [];
  let totalCostSum = 0;
  let totalMarketValSum = 0;
  let totalUnrealizedSum = 0;

  // Group into Marginable (Category A & B) vs Non-Marginable (Category N & Z)
  const marginable: any[] = [];
  const nonMarginable: any[] = [];

  portfolio.forEach((item) => {
    const stock = stockBySymbol.get(item.symbol);
    const category = stock?.category || 'A';
    const ltp = (stock?.ltp && stock.ltp > 0) ? stock.ltp : (stock?.ycp ?? item.averageBuyPrice);
    const totalCost = item.totalCost || item.quantity * item.averageBuyPrice;
    const marketVal = item.quantity * ltp;
    const pnl = marketVal - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    const mktWeight = totals.currentValue > 0 ? (marketVal / totals.currentValue) * 100 : 0;

    // Mature shares vs immature (T+1 calculation)
    const nowTs = Date.now();
    const saleable = (item.lots || []).reduce((acc: number, lot: any) => {
      const lotDateStr = lot.date || lot.purchaseDate;
      const lotDate = lotDateStr ? new Date(lotDateStr).getTime() : 0;
      const shares = (lot.shares ?? lot.quantity ?? 0) as number;
      const isMature = nowTs - lotDate > 18 * 3600 * 1000;
      return isMature ? acc + shares : acc;
    }, 0);
    const lockIn = Math.max(0, item.quantity - saleable);

    const rowObj = {
      symbol: item.symbol,
      category,
      totalQty: item.quantity,
      lockIn,
      saleable: saleable > 0 ? saleable : item.quantity,
      avgCost: item.averageBuyPrice,
      totalCost,
      marketRate: ltp,
      marketVal,
      pnl,
      pnlPct,
      mktWeight,
    };

    if (category === 'A' || category === 'B') {
      marginable.push(rowObj);
    } else {
      nonMarginable.push(rowObj);
    }

    totalCostSum += totalCost;
    totalMarketValSum += marketVal;
    totalUnrealizedSum += pnl;
  });

  // Build table body with subheadings
  let sn = 1;
  if (marginable.length > 0) {
    holdingsRows.push([
      { content: 'Marginable Instrument', colSpan: 13, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    ]);
    let subCost = 0, subVal = 0, subPnl = 0;
    marginable.forEach((m) => {
      subCost += m.totalCost;
      subVal += m.marketVal;
      subPnl += m.pnl;
      holdingsRows.push([
        sn++,
        m.symbol,
        m.category,
        fmt(m.totalQty, 0),
        fmt(m.lockIn, 0),
        fmt(m.saleable, 0),
        fmt(m.avgCost, 2),
        fmt(m.totalCost, 2),
        fmt(m.marketRate, 2),
        fmt(m.marketVal, 2),
        signed(m.pnl),
        `${signed(m.pnlPct)}%`,
        `${fmt(m.mktWeight, 2)}%`,
      ]);
    });
    holdingsRows.push([
      { content: 'Total:', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' } },
      fmt(subCost, 2),
      '',
      fmt(subVal, 2),
      signed(subPnl),
      '',
      '',
    ]);
  }

  if (nonMarginable.length > 0) {
    holdingsRows.push([
      { content: 'Non Marginable Instrument', colSpan: 13, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    ]);
    let subCost = 0, subVal = 0, subPnl = 0;
    nonMarginable.forEach((m) => {
      subCost += m.totalCost;
      subVal += m.marketVal;
      subPnl += m.pnl;
      holdingsRows.push([
        sn++,
        m.symbol,
        m.category,
        fmt(m.totalQty, 0),
        fmt(m.lockIn, 0),
        fmt(m.saleable, 0),
        fmt(m.avgCost, 2),
        fmt(m.totalCost, 2),
        fmt(m.marketRate, 2),
        fmt(m.marketVal, 2),
        signed(m.pnl),
        `${signed(m.pnlPct)}%`,
        `${fmt(m.mktWeight, 2)}%`,
      ]);
    });
    holdingsRows.push([
      { content: 'Total:', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' } },
      fmt(subCost, 2),
      '',
      fmt(subVal, 2),
      signed(subPnl),
      '',
      '',
    ]);
  }

  if (holdingsRows.length === 0) {
    holdingsRows.push([
      { content: 'No active stock securities currently held in portfolio.', colSpan: 13, styles: { halign: 'center', fontStyle: 'italic' } },
    ]);
  } else {
    // Grand Total Row
    const grandPct = totalCostSum > 0 ? (totalUnrealizedSum / totalCostSum) * 100 : 0;
    holdingsRows.push([
      { content: 'Grand Total:', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
      { content: fmt(totalCostSum, 2), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: '', styles: { fillColor: [248, 250, 252] } },
      { content: fmt(totalMarketValSum, 2), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: signed(totalUnrealizedSum), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: `${signed(grandPct)}%`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: '100.00%', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [[
      'SN',
      'Instrument',
      'G',
      'Total',
      'Lock In',
      'Saleable',
      'Avg. Cost',
      'Total Cost',
      'Market Rate',
      'Market Value',
      'Unrealized Gain/(Loss)',
      '%Gain / (Loss)',
      'Mkt Val %',
    ]],
    body: holdingsRows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      halign: 'right',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 }, // SN
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 20 }, // Instrument
      2: { halign: 'center', cellWidth: 7 }, // G
      3: { cellWidth: 12 }, // Total
      4: { cellWidth: 12 }, // Lock In
      5: { cellWidth: 12 }, // Saleable
      6: { cellWidth: 15 }, // Avg Cost
      7: { cellWidth: 18 }, // Total Cost
      8: { cellWidth: 16 }, // Market Rate
      9: { cellWidth: 18 }, // Market Value
      10: { cellWidth: 21 }, // Unrealized Gain/(Loss)
      11: { cellWidth: 14 }, // %Gain
      12: { cellWidth: 12 }, // Mkt Val %
    },
    margin: { left: leftMargin, right: 14 },
    didParseCell: (hookData) => {
      // Colorize unrealized gain / loss
      if (hookData.column.index === 10 || hookData.column.index === 11) {
        const text = String(hookData.cell.raw || '');
        if (text.startsWith('+')) {
          hookData.cell.styles.textColor = [5, 150, 105]; // emerald-600
        } else if (text.startsWith('-') || text.startsWith('−')) {
          hookData.cell.styles.textColor = [220, 38, 38]; // rose-600
        }
      }
    },
  });

  // Calculate table end position
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  let summaryY = finalY + 3;

  // Check if we need a new page for financial summaries
  if (summaryY + 70 > pageHeight) {
    doc.addPage();
    summaryY = 14;
  }

  // 4. FINANCIAL STATUS & DEPOSIT SUMMARY (Clean 4-Column autoTable to eliminate all text overlap)
  const totalEquity = balance + totals.currentValue;
  const netGainLoss = realizedGainLoss + totals.unrealisedPnl;
  const estimatedDeposits = Math.max(10000, balance + totals.investment);

  const financialGridBody: any[] = [
    [
      { content: 'Account Status Till Today', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: 'Market Valuation & Portfolio Equity', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
    ],
    ['Available Balance', `BDT ${fmt(balance, 2)}`, 'Market Value of Securities', `BDT ${fmt(totals.currentValue, 2)}`],
    ['Receivable Sales', 'BDT 0.00', 'Total Equity', `BDT ${fmt(totalEquity, 2)}`],
    ['Cheque In Hand/Transit', 'BDT 0.00', 'Loan Ratio', '0.00'],
    ['Ledger Balance', `BDT ${fmt(balance, 2)}`, 'Purchase Power', `BDT ${fmt(balance, 2)}`],
    ['Accrued Interest & Fees', 'BDT 0.00', 'Realized Gain / Loss', { content: `BDT ${signed(realizedGainLoss)}`, styles: { textColor: realizedGainLoss >= 0 ? [5, 150, 105] : [220, 38, 38], fontStyle: 'bold' } }],
    ['Current Asset / Liabilities', `BDT ${fmt(balance, 2)}`, 'Unrealized Gain / Loss', { content: `BDT ${signed(totals.unrealisedPnl)}`, styles: { textColor: totals.unrealisedPnl >= 0 ? [5, 150, 105] : [220, 38, 38], fontStyle: 'bold' } }],
    [
      { content: 'Deposit & Withdrawal Status', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      'Day P&L',
      { content: `BDT ${signed(totals.dayPnl)}`, styles: { textColor: totals.dayPnl >= 0 ? [5, 150, 105] : [220, 38, 38], fontStyle: 'bold' } },
    ],
    ['Initial Demo Capital', 'BDT 10,000.00', 'Net Gain / Loss', { content: `BDT ${signed(netGainLoss)}`, styles: { textColor: netGainLoss >= 0 ? [5, 150, 105] : [220, 38, 38], fontStyle: 'bold' } }],
    ['Total Coins Recharge', `BDT ${fmt(Math.max(0, estimatedDeposits - 10000), 2)}`, 'Margin Ratio', '0.00'],
    ['Total Deposit', `BDT ${fmt(estimatedDeposits, 2)}`, 'Amount to be Deposited', 'BDT 0.00'],
    ['Withdrawal', 'BDT 0.00', '', ''],
    ['Net Deposit', `BDT ${fmt(estimatedDeposits, 2)}`, '', ''],
  ];

  autoTable(doc, {
    startY: summaryY,
    body: financialGridBody,
    theme: 'plain',
    styles: {
      fontSize: 7.2,
      cellPadding: 0.9,
      textColor: [30, 41, 59],
      lineColor: [241, 245, 249],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 48 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 43 },
      2: { halign: 'left', cellWidth: 48 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 43 },
    },
    margin: { left: leftMargin, right: 14 },
  });

  const finalSummaryY = (doc as any).lastAutoTable?.finalY || summaryY + 45;

  // 5. MANDATORY RED LEGAL DISCLAIMER WITH CAUTION ICON
  const disclaimerStartY = Math.min(finalSummaryY + 3, pageHeight - 32);
  const cardWidth = pageWidth - 28;
  const cardHeight = 17.5;

  // Red alert box background & border
  doc.setFillColor(254, 242, 242); // #FEF2F2 light red
  doc.setDrawColor(239, 68, 68); // #EF4444 red border
  doc.setLineWidth(0.4);
  doc.roundedRect(leftMargin, disclaimerStartY, cardWidth, cardHeight, 2, 2, 'FD');

  // Draw crisp Vector Caution Triangle
  const tx = leftMargin + 3.5;
  const ty = disclaimerStartY + 3.2;
  doc.setFillColor(220, 38, 38); // #DC2626
  doc.setDrawColor(185, 28, 28);
  doc.triangle(tx + 3.2, ty, tx, ty + 6.4, tx + 6.4, ty + 6.4, 'FD');

  // Exclamation mark inside triangle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('!', tx + 3.2, ty + 5.2, { align: 'center' });

  // Red Disclaimer Heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(185, 28, 28); // #B91C1C deep red
  doc.text(
    'MANDATORY VIRTUAL SIMULATION & EDUCATIONAL DISCLAIMER',
    leftMargin + 12,
    disclaimerStartY + 4.8
  );

  // Red Disclaimer Body Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(153, 27, 27); // #991B1B readable dark red
  const disclaimerText =
    'This portfolio statement is generated strictly for learning and educational paper-trading simulation purposes by StockSimulatorBD (www.stocksimulator.tech). All BDT balances, trades, valuations, and securities shown are 100% VIRTUAL paper currency with ZERO monetary value and do not represent real money, real shares, or an actual DSE brokerage account. StockSimulatorBD is an educational platform and not a licensed broker or investment advisor under BSEC.';

  const splitDisclaimer = doc.splitTextToSize(disclaimerText, cardWidth - 14);
  doc.text(splitDisclaimer, leftMargin + 12, disclaimerStartY + 8.5);

  // Computer generated notice above or below
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "'This is a Computer Generated Statement. No Signature is Required.'",
    pageWidth / 2,
    disclaimerStartY + cardHeight + 3.5,
    { align: 'center' }
  );

  // Bottom verification footer
  const footerY = pageHeight - 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Print Date & Time : ${ticket.dhakaTimeStr}`,
    leftMargin,
    footerY
  );
  doc.text(
    'Powered By StockSimulatorBD Engine  |  DSE Paper Trading Core',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Page 1 of 1`,
    rightMargin,
    footerY,
    { align: 'right' }
  );

  // Trigger browser download
  const cleanDate = fullDateStr.replace(/[^a-zA-Z0-9-]/g, '_');
  const fileName = `StockSimulatorBD_Portfolio_Statement_${cleanDate}.pdf`;
  doc.save(fileName);
}
