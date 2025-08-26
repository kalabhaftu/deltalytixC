'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export interface ExportOptions {
  filename?: string
  title?: string
  subtitle?: string
  includeCharts?: boolean
  includeLogo?: boolean
  pageOrientation?: 'portrait' | 'landscape'
  pageFormat?: 'a4' | 'letter' | 'legal'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface TradeData {
  id: string
  entryDate: string
  closeDate?: string
  accountNumber: string
  instrument: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  closePrice?: number
  pnl: number
  commission: number
  timeInPosition?: number
  tags?: string[]
  notes?: string
}

export interface AnalyticsData {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPnL: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  sharpeRatio?: number
  maxDrawdown?: number
  totalCommission: number
  avgTimeInPosition?: number
}

export class PDFExporter {
  private pdf: jsPDF
  private margins: { top: number; right: number; bottom: number; left: number }
  private currentY: number = 0

  constructor(options: ExportOptions = {}) {
    const orientation = options.pageOrientation || 'portrait'
    const format = options.pageFormat || 'a4'
    
    this.pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    })
    
    this.margins = options.margins || {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    }
    
    this.currentY = this.margins.top
  }

  // Add header with title and logo
  addHeader(title: string, subtitle?: string, logoUrl?: string) {
    const pageWidth = this.pdf.internal.pageSize.getWidth()
    
    // Add logo if provided
    if (logoUrl) {
      try {
        this.pdf.addImage(logoUrl, 'PNG', this.margins.left, this.currentY, 30, 15)
      } catch (error) {
        console.warn('Failed to add logo to PDF:', error)
      }
    }
    
    // Add title
    this.pdf.setFontSize(20)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text(title, logoUrl ? this.margins.left + 35 : this.margins.left, this.currentY + 10)
    
    // Add subtitle
    if (subtitle) {
      this.pdf.setFontSize(12)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.text(subtitle, logoUrl ? this.margins.left + 35 : this.margins.left, this.currentY + 18)
    }
    
    // Add date
    this.pdf.setFontSize(10)
    this.pdf.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      pageWidth - this.margins.right - 50,
      this.currentY + 10
    )
    
    this.currentY += 35
    this.addLine()
  }

  // Add a horizontal line
  addLine() {
    const pageWidth = this.pdf.internal.pageSize.getWidth()
    this.pdf.setLineWidth(0.5)
    this.pdf.line(
      this.margins.left,
      this.currentY,
      pageWidth - this.margins.right,
      this.currentY
    )
    this.currentY += 10
  }

  // Add section title
  addSectionTitle(title: string) {
    this.pdf.setFontSize(16)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text(title, this.margins.left, this.currentY)
    this.currentY += 15
  }

  // Add analytics summary
  addAnalyticsSummary(analytics: AnalyticsData) {
    this.addSectionTitle('Trading Performance Summary')
    
    const summaryData = [
      ['Total Trades', analytics.totalTrades.toString()],
      ['Winning Trades', analytics.winningTrades.toString()],
      ['Losing Trades', analytics.losingTrades.toString()],
      ['Win Rate', `${analytics.winRate.toFixed(2)}%`],
      ['Total PnL', `$${analytics.totalPnL.toFixed(2)}`],
      ['Average Win', `$${analytics.avgWin.toFixed(2)}`],
      ['Average Loss', `$${analytics.avgLoss.toFixed(2)}`],
      ['Profit Factor', analytics.profitFactor.toFixed(2)],
      ['Total Commission', `$${analytics.totalCommission.toFixed(2)}`],
    ]

    if (analytics.sharpeRatio !== undefined) {
      summaryData.push(['Sharpe Ratio', analytics.sharpeRatio.toFixed(2)])
    }

    if (analytics.maxDrawdown !== undefined) {
      summaryData.push(['Max Drawdown', `${analytics.maxDrawdown.toFixed(2)}%`])
    }

    if (analytics.avgTimeInPosition !== undefined) {
      summaryData.push(['Avg. Time in Position', `${analytics.avgTimeInPosition.toFixed(0)} min`])
    }

    autoTable(this.pdf, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 126, 234],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        1: { halign: 'right' },
      },
      margin: { left: this.margins.left, right: this.margins.right },
    })

    this.currentY = (this.pdf as any).lastAutoTable.finalY + 15
  }

  // Add trades table
  addTradesTable(trades: TradeData[]) {
    this.addSectionTitle('Trade Details')
    
    const tableData = trades.map(trade => [
      trade.entryDate,
      trade.accountNumber,
      trade.instrument,
      trade.side.toUpperCase(),
      trade.quantity.toString(),
      `$${trade.entryPrice.toFixed(2)}`,
      trade.closePrice ? `$${trade.closePrice.toFixed(2)}` : 'Open',
      `$${trade.pnl.toFixed(2)}`,
      `$${trade.commission.toFixed(2)}`,
      trade.timeInPosition ? `${trade.timeInPosition}min` : 'N/A',
    ])

    autoTable(this.pdf, {
      startY: this.currentY,
      head: [['Date', 'Account', 'Symbol', 'Side', 'Qty', 'Entry', 'Exit', 'PnL', 'Commission', 'Duration']],
      body: tableData,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 126, 234],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { 
          halign: 'right',
          // Cell styling for P&L column
        },
        8: { halign: 'right' },
        9: { halign: 'center' },
      },
      margin: { left: this.margins.left, right: this.margins.right },
    })

    this.currentY = (this.pdf as any).lastAutoTable.finalY + 15
  }

  // Add chart from HTML element
  async addChart(chartElement: HTMLElement, title: string, width?: number, height?: number) {
    try {
      this.addSectionTitle(title)
      
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pageWidth = this.pdf.internal.pageSize.getWidth()
      const chartWidth = width || pageWidth - this.margins.left - this.margins.right
      const chartHeight = height || (canvas.height * chartWidth) / canvas.width
      
      // Check if we need a new page
      if (this.currentY + chartHeight > this.pdf.internal.pageSize.getHeight() - this.margins.bottom) {
        this.pdf.addPage()
        this.currentY = this.margins.top
      }
      
      this.pdf.addImage(imgData, 'PNG', this.margins.left, this.currentY, chartWidth, chartHeight)
      this.currentY += chartHeight + 15
    } catch (error) {
      console.error('Failed to add chart to PDF:', error)
      // Add placeholder text
      this.pdf.setFontSize(10)
      this.pdf.text('Chart could not be exported', this.margins.left, this.currentY)
      this.currentY += 20
    }
  }

  // Add footer
  addFooter() {
    const pageCount = this.pdf.getNumberOfPages()
    const pageWidth = this.pdf.internal.pageSize.getWidth()
    const pageHeight = this.pdf.internal.pageSize.getHeight()
    
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i)
      this.pdf.setFontSize(8)
      this.pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
      this.pdf.text(
        'Generated by Deltalytix',
        this.margins.left,
        pageHeight - 10
      )
      this.pdf.text(
        new Date().toISOString(),
        pageWidth - this.margins.right - 30,
        pageHeight - 10
      )
    }
  }

  // Save the PDF
  save(filename: string = 'deltalytix-report.pdf') {
    this.addFooter()
    this.pdf.save(filename)
  }

  // Get PDF as blob
  getBlob(): Blob {
    this.addFooter()
    return this.pdf.output('blob')
  }
}

export class ExcelExporter {
  private workbook: ExcelJS.Workbook
  private worksheet: ExcelJS.Worksheet | undefined

  constructor() {
    this.workbook = new ExcelJS.Workbook()
    this.workbook.creator = 'Deltalytix'
    this.workbook.created = new Date()
  }

  // Add trades worksheet
  addTradesSheet(trades: TradeData[], analytics: AnalyticsData) {
    this.worksheet = this.workbook.addWorksheet('Trades')
    
    // Set column widths
    this.worksheet.columns = [
      { header: 'Trade ID', key: 'id', width: 15 },
      { header: 'Entry Date', key: 'entryDate', width: 12 },
      { header: 'Close Date', key: 'closeDate', width: 12 },
      { header: 'Account', key: 'accountNumber', width: 15 },
      { header: 'Instrument', key: 'instrument', width: 12 },
      { header: 'Side', key: 'side', width: 8 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Entry Price', key: 'entryPrice', width: 12 },
      { header: 'Close Price', key: 'closePrice', width: 12 },
      { header: 'PnL', key: 'pnl', width: 12 },
      { header: 'Commission', key: 'commission', width: 12 },
      { header: 'Time in Position (min)', key: 'timeInPosition', width: 18 },
      { header: 'Tags', key: 'tags', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
    ]

    // Style header
    this.worksheet.getRow(1).font = { bold: true }
    this.worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4285F4' }
    }
    this.worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true }

    // Add trade data
    trades.forEach((trade, index) => {
      const row = this.worksheet!.addRow({
        id: trade.id,
        entryDate: trade.entryDate,
        closeDate: trade.closeDate || '',
        accountNumber: trade.accountNumber,
        instrument: trade.instrument,
        side: trade.side,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        closePrice: trade.closePrice || '',
        pnl: trade.pnl,
        commission: trade.commission,
        timeInPosition: trade.timeInPosition || '',
        tags: trade.tags?.join(', ') || '',
        notes: trade.notes || '',
      })

      // Color code PnL
      const pnlCell = row.getCell('pnl')
      if (trade.pnl > 0) {
        pnlCell.font = { color: { argb: 'FF00AA00' } }
      } else if (trade.pnl < 0) {
        pnlCell.font = { color: { argb: 'FFAA0000' } }
      }

      // Format numbers
      row.getCell('entryPrice').numFmt = '"$"#,##0.00'
      row.getCell('closePrice').numFmt = '"$"#,##0.00'
      row.getCell('pnl').numFmt = '"$"#,##0.00'
      row.getCell('commission').numFmt = '"$"#,##0.00'
    })

    // Add analytics summary
    const summaryRow = this.worksheet.rowCount + 3
    this.worksheet.getCell(`A${summaryRow}`).value = 'SUMMARY'
    this.worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 14 }

    const summaryData = [
      ['Total Trades', analytics.totalTrades],
      ['Winning Trades', analytics.winningTrades],
      ['Losing Trades', analytics.losingTrades],
      ['Win Rate', `${analytics.winRate.toFixed(2)}%`],
      ['Total PnL', analytics.totalPnL],
      ['Average Win', analytics.avgWin],
      ['Average Loss', analytics.avgLoss],
      ['Profit Factor', analytics.profitFactor],
      ['Total Commission', analytics.totalCommission],
    ]

    summaryData.forEach(([label, value], index) => {
      const rowIndex = summaryRow + index + 1
      this.worksheet!.getCell(`A${rowIndex}`).value = label
      this.worksheet!.getCell(`B${rowIndex}`).value = value
      this.worksheet!.getCell(`A${rowIndex}`).font = { bold: true }
      
      if (typeof value === 'number' && typeof label === 'string' && label.includes('PnL')) {
        this.worksheet!.getCell(`B${rowIndex}`).numFmt = '"$"#,##0.00'
      }
    })
  }

  // Add analytics worksheet
  addAnalyticsSheet(analytics: AnalyticsData, monthlyData?: any[]) {
    const analyticsSheet = this.workbook.addWorksheet('Analytics')
    
    // Performance metrics
    analyticsSheet.getCell('A1').value = 'Performance Metrics'
    analyticsSheet.getCell('A1').font = { bold: true, size: 14 }
    
    const metricsData = [
      ['Metric', 'Value'],
      ['Total Trades', analytics.totalTrades],
      ['Win Rate', `${analytics.winRate.toFixed(2)}%`],
      ['Total PnL', analytics.totalPnL],
      ['Profit Factor', analytics.profitFactor],
      ['Average Win', analytics.avgWin],
      ['Average Loss', analytics.avgLoss],
      ['Total Commission', analytics.totalCommission],
    ]

    metricsData.forEach((row, index) => {
      const rowIndex = index + 2
      analyticsSheet.getCell(`A${rowIndex}`).value = row[0]
      analyticsSheet.getCell(`B${rowIndex}`).value = row[1]
      
      if (index === 0) {
        analyticsSheet.getRow(rowIndex).font = { bold: true }
      }
    })

    // Monthly breakdown if provided
    if (monthlyData && monthlyData.length > 0) {
      const monthlyStartRow = metricsData.length + 5
      analyticsSheet.getCell(`A${monthlyStartRow}`).value = 'Monthly Breakdown'
      analyticsSheet.getCell(`A${monthlyStartRow}`).font = { bold: true, size: 14 }
      
      const monthlyHeaders = ['Month', 'Trades', 'PnL', 'Win Rate']
      monthlyHeaders.forEach((header, index) => {
        const cell = analyticsSheet.getCell(`${String.fromCharCode(65 + index)}${monthlyStartRow + 1}`)
        cell.value = header
        cell.font = { bold: true }
      })

      monthlyData.forEach((month, index) => {
        const rowIndex = monthlyStartRow + index + 2
        analyticsSheet.getCell(`A${rowIndex}`).value = month.month
        analyticsSheet.getCell(`B${rowIndex}`).value = month.trades
        analyticsSheet.getCell(`C${rowIndex}`).value = month.pnl
        analyticsSheet.getCell(`D${rowIndex}`).value = `${month.winRate.toFixed(2)}%`
        
        // Format PnL
        analyticsSheet.getCell(`C${rowIndex}`).numFmt = '"$"#,##0.00'
      })
    }

    // Set column widths
    analyticsSheet.getColumn('A').width = 20
    analyticsSheet.getColumn('B').width = 15
    analyticsSheet.getColumn('C').width = 15
    analyticsSheet.getColumn('D').width = 15
  }

  // Save the Excel file
  async save(filename: string = 'deltalytix-export.xlsx') {
    const buffer = await this.workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    saveAs(blob, filename)
  }

  // Get Excel as buffer
  async getBuffer(): Promise<Buffer> {
    return (await this.workbook.xlsx.writeBuffer()) as unknown as Buffer
  }
}

// Utility functions
export async function exportTradesToPDF(
  trades: TradeData[],
  analytics: AnalyticsData,
  options: ExportOptions = {}
): Promise<void> {
  const exporter = new PDFExporter(options)
  
  exporter.addHeader(
    options.title || 'Trading Report',
    options.subtitle || `${trades.length} trades analyzed`,
    options.includeLogo ? '/logo.png' : undefined
  )
  
  exporter.addAnalyticsSummary(analytics)
  exporter.addTradesTable(trades)
  
  exporter.save(options.filename || 'trading-report.pdf')
}

export async function exportTradesToExcel(
  trades: TradeData[],
  analytics: AnalyticsData,
  options: ExportOptions = {}
): Promise<void> {
  const exporter = new ExcelExporter()
  
  exporter.addTradesSheet(trades, analytics)
  exporter.addAnalyticsSheet(analytics)
  
  await exporter.save(options.filename || 'trading-data.xlsx')
}

export async function exportChartToPDF(
  chartElement: HTMLElement,
  title: string,
  options: ExportOptions = {}
): Promise<void> {
  const exporter = new PDFExporter(options)
  
  exporter.addHeader(
    title,
    options.subtitle || 'Chart Export',
    options.includeLogo ? '/logo.png' : undefined
  )
  
  await exporter.addChart(chartElement, title)
  exporter.save(options.filename || 'chart-export.pdf')
}
