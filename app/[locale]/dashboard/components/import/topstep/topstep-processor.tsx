import React, { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'
import { Button } from "@/components/ui/button"
import { formatInTimeZone } from 'date-fns-tz'
import { useUserStore } from '../../../../../../store/user-store'
import { v4 as uuidv4 } from 'uuid'

interface TopstepProcessorProps {
    headers: string[];
    csvData: string[][];
    setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
    accountNumber: string;
}

const mappings: { [key: string]: string } = {
    "ContractName": "instrument",
    "Size": "quantity",
    "PnL": "pnl",
    "Fees": "commission",
    "Type": "side",
    "Id": "entryId",
    "EntryPrice": "entryPrice",
    "EnteredAt": "entryDate",
    "ExitPrice": "closePrice",
    "ExitedAt": "closeDate",
}

export default function TopstepProcessor({ headers, csvData, setProcessedTrades, accountNumber }: TopstepProcessorProps) {
    const [trades, setTrades] = useState<Trade[]>([])
    const timezone = useUserStore(state => state.timezone)
    const user = useUserStore(state => state.user)
    const supabaseUser = useUserStore(state => state.supabaseUser)

    const processTrades = useCallback(() => {
        const newTrades: Trade[] = [];

        csvData.forEach(row => {
            const item: Partial<Trade> = {};
            let quantity = 0;
            let isValidTrade = true;

            headers.forEach((header, index) => {
                const mappingKey = Object.keys(mappings).find(key => header.includes(key));
                if (mappingKey) {
                    const key = mappings[mappingKey] as keyof Trade;
                    const cellValue = row[index];

                    // Skip trades with undefined values for required fields
                    if (!cellValue && ['instrument', 'quantity', 'entryPrice', 'closePrice', 'entryDate', 'closeDate'].includes(key)) {
                        isValidTrade = false;
                        return;
                    }

                    switch (key) {
                        case 'quantity':
                            quantity = parseFloat(cellValue) || 0;
                            if (quantity <= 0) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = quantity;
                            break;
                        case 'pnl':
                            const pnl = parseFloat(cellValue);
                            if (isNaN(pnl)) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = pnl;
                            break;
                        case 'commission':
                            const commission = parseFloat(cellValue) || 0;
                            if (commission < 0) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = commission;
                            break;
                        case 'side':
                            if (!cellValue) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = cellValue.toLowerCase();
                            break;
                        case 'entryPrice':
                        case 'closePrice':
                            const price = parseFloat(cellValue);
                            if (isNaN(price) || price <= 0) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = price.toString();
                            break;
                        case 'instrument':
                            if (!cellValue) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = cellValue.slice(0, -2);
                            break;
                        default:
                            item[key] = cellValue as any;
                    }
                }
            });

            // Process dates with timezone consideration
            try {
                if (item.entryDate) {
                    const localDate = new Date(item.entryDate);
                    if (isNaN(localDate.getTime())) {
                        isValidTrade = false;
                        return;
                    }
                    
                    // Get timezone offset in minutes
                    const timezoneOffsetInMinutes = localDate.getTimezoneOffset();
                    
                    // Convert to UTC by adjusting for the timezone offset
                    const utcDate = new Date(localDate.getTime() - (timezoneOffsetInMinutes * 60000));
                    
                    // Format with explicit timezone offset
                    item.entryDate = utcDate.toISOString().replace('Z', '+00:00');
                }

                if (item.closeDate) {
                    const localDate = new Date(item.closeDate);
                    if (isNaN(localDate.getTime())) {
                        isValidTrade = false;
                        return;
                    }
                    
                    // Get timezone offset in minutes
                    const timezoneOffsetInMinutes = localDate.getTimezoneOffset();
                    
                    // Convert to UTC by adjusting for the timezone offset
                    const utcDate = new Date(localDate.getTime() - (timezoneOffsetInMinutes * 60000));
                    
                    // Format with explicit timezone offset
                    item.closeDate = utcDate.toISOString().replace('Z', '+00:00');
                }
            } catch (e) {
                isValidTrade = false;
                return;
            }

            // Calculate time in position in seconds using UTC timestamps
            if (item.entryDate && item.closeDate) {
                const entryTime = new Date(item.entryDate).getTime();
                const closeTime = new Date(item.closeDate).getTime();
                item.timeInPosition = Math.round((closeTime - entryTime) / 1000);
            } else {
                isValidTrade = false;
                return;
            }

            // Only add valid trades
            if (isValidTrade) {
                const currentUser = user || supabaseUser
                if (!currentUser?.id) {
                    return
                }

                // Create complete Trade object with all required fields
                const completeTrade: Trade = {
                    id: uuidv4(),
                    accountNumber,
                    quantity: item.quantity || 0,
                    entryId: item.entryId || null,
                    closeId: item.closeId || null,
                    instrument: item.instrument || '',
                    entryPrice: item.entryPrice || '',
                    closePrice: item.closePrice || '',
                    entryDate: item.entryDate || '',
                    closeDate: item.closeDate || '',
                    pnl: item.pnl || 0,
                    timeInPosition: item.timeInPosition || 0,
                    userId: currentUser.id,
                    side: item.side || '',
                    commission: item.commission || 0,
                    createdAt: new Date(),
                    comment: null,
                    videoUrl: null,
                    tags: [],
                    imageBase64: null,
                    imageBase64Second: null,
                    imageBase64Third: null,
                    imageBase64Fourth: null,
                    groupId: null,
                    symbol: null,
                    entryTime: null,
                    exitTime: null,
                    fees: 0,
                    realizedPnl: null,
                    equityAtOpen: null,
                    equityAtClose: null,
                    rawBrokerId: null,
                    phaseId: null,
                    accountId: null,
                    strategy: null,
                    closeReason: null,
                }
                
                newTrades.push(completeTrade);
            }
        });

        // if (newTrades.length < csvData.length) {
            // toast({
            //     title: "Invalid Trades Filtered",
            //     description: `${csvData.length - newTrades.length} trade(s) were filtered out due to invalid or missing data.`,
            //     variant: "default",
            // });
        // }

        setTrades(newTrades);
        setProcessedTrades(newTrades);
    }, [csvData, headers, setProcessedTrades, accountNumber, user, supabaseUser]);

    useEffect(() => {
        processTrades();
    }, [processTrades]);

    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalCommission = trades.reduce((sum, trade) => sum + (trade.commission || 0), 0);
    const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)));

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="space-y-4 p-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Processed Trades</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Instrument</TableHead>
                                    <TableHead>Side</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Entry Price</TableHead>
                                    <TableHead>Close Price</TableHead>
                                    <TableHead>Entry Date</TableHead>
                                    <TableHead>Close Date</TableHead>
                                    <TableHead>PnL</TableHead>
                                    <TableHead>Commission</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trades.map((trade) => (
                                    <TableRow key={trade.id}>
                                        <TableCell>{trade.accountNumber}</TableCell>
                                        <TableCell>{trade.instrument}</TableCell>
                                        <TableCell>{trade.side}</TableCell>
                                        <TableCell>{trade.quantity}</TableCell>
                                        <TableCell>{trade.entryPrice}</TableCell>
                                        <TableCell>{trade.closePrice}</TableCell>
                                        <TableCell>
                                            {formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd HH:mm:ss')}
                                        </TableCell>
                                        <TableCell>
                                            {trade.closeDate ? formatInTimeZone(new Date(trade.closeDate), timezone, 'yyyy-MM-dd HH:mm:ss') : '-'}
                                        </TableCell>
                                        <TableCell className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {trade.pnl?.toFixed(2)}
                                        </TableCell>
                                        <TableCell>{trade.commission?.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Total PnL</h3>
                            <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalPnL.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Total Commission</h3>
                            <p className="text-xl font-bold text-blue-600">
                                {totalCommission.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Instruments Traded</h3>
                        <div className="flex flex-wrap gap-2">
                            {uniqueInstruments.map((instrument) => (
                                <Button
                                    key={instrument}
                                    variant="outline"
                                    onClick={() => toast({
                                        title: "Instrument Information",
                                        description: `You traded ${instrument}. For more details, please check the trades table.`
                                    })}
                                >
                                    {instrument}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 