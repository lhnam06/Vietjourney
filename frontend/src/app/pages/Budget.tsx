import { useMemo } from 'react';
import { DollarSign, TrendingUp, Users, Plus, Receipt, ArrowUpRight, ArrowDownRight, Smartphone, QrCode } from 'lucide-react';
import { useParams } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockTransactions, mockUsers, calculateDebtSettlement, mockTrips } from '../data/mockData';
import { loadTripData } from '../lib/tripStorage';

// Format VND currency
const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
  }).format(amount).replace(/\s?VND$/, ' VND');
};

// Format debt amount in thousands
const formatDebtK = (amount: number) => {
  const thousands = Math.abs(amount) / 1000;
  return `${thousands.toFixed(0)}K`;
};

export default function Budget() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam || 'trip-1';
  const stored = typeof window !== 'undefined' ? loadTripData(tripId) : null;
  const trip = stored?.trip ?? mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];
  const transactions = stored?.transactions?.length ? stored.transactions : mockTransactions;
  const users = mockUsers.filter((u) => trip.participants.includes(u.id));

  // Calculate totals
  const totalSpent = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  
  const budgetPercentage = (totalSpent / trip.totalBudget) * 100;

  // Calculate debt settlement
  const balances = useMemo(() => calculateDebtSettlement(transactions, users), [transactions, users]);

  // Group transactions by category
  const transactionsByCategory = useMemo(() => {
    const grouped: { [key: string]: typeof transactions } = {};
    transactions.forEach((t) => {
      if (!grouped[t.category]) {
        grouped[t.category] = [];
      }
      grouped[t.category].push(t);
    });
    return grouped;
  }, [transactions]);

  return (
    <div className="h-screen bg-[var(--vj-bg)] overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)] border-b border-[var(--vj-border)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">QUẢN LÝ NGÂN SÁCH</h1>
              <p className="text-white/80">{trip.name}</p>
            </div>
            <Button className="bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] shadow-lg text-white font-medium">
              <Plus className="w-4 h-4 mr-2" />
              Chia Tiền
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Budget Summary Card - NGÂN SÁCH */}
            <Card className="p-6 bg-gradient-to-br from-[var(--vj-primary)] to-[var(--vj-primary-2)] text-white shadow-xl border border-[var(--vj-border)]">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-white/80 mb-1 uppercase tracking-wide">Tổng Ngân Sách</p>
                  <p className="text-4xl font-bold">{formatVND(trip.totalBudget)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/80 mb-1 uppercase tracking-wide">Đã Chi</p>
                  <p className="text-2xl font-bold">{formatVND(totalSpent)}</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white/90">Tiến Độ Ngân Sách</span>
                  <span className="font-semibold">{budgetPercentage.toFixed(1)}%</span>
                </div>
                <Progress
                  value={budgetPercentage}
                  className="h-3 bg-white/20"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <span className="text-sm text-white/80 uppercase tracking-wide">Còn Lại</span>
                <span className="text-xl font-bold text-green-300">
                  {formatVND(trip.totalBudget - totalSpent)}
                </span>
              </div>
            </Card>

            {/* Debt Settlement Section - CHIA TIỀN */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0A4A6E]" />
                  <h2 className="text-xl font-bold text-[#0A4A6E]">CHIA TIỀN</h2>
                </div>
                <Button 
                  variant="outline" 
                  className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10"
                  size="sm"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Quét QR Chuyển Khoản
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {users.map((user) => {
                  const balance = balances[user.id] || 0;
                  const isPositive = balance > 0;
                  
                  return (
                    <Card key={user.id} className={`p-5 ${isPositive ? 'bg-green-50 border-green-200 border-2' : balance < 0 ? 'bg-red-50 border-red-200 border-2' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-12 h-12 ring-2 ring-white">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-600 font-medium">
                          {isPositive ? 'Được Trả' : balance < 0 ? 'Cần Trả' : 'Đã Thanh Toán'}
                        </span>
                        <div className="flex items-center gap-1">
                          {isPositive ? (
                            <ArrowDownRight className="w-4 h-4 text-green-600" />
                          ) : balance < 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          ) : null}
                          <span className={`font-bold text-lg ${isPositive ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                            {formatDebtK(balance)}
                          </span>
                        </div>
                      </div>

                      {/* Payment icons for Vietnam */}
                      {balance !== 0 && (
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                          <p className="text-xs text-slate-500 flex-shrink-0">Chuyển khoản:</p>
                          <div className="flex items-center gap-1.5">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-[8px] font-bold">
                              VCB
                            </div>
                            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center text-white text-[8px] font-bold">
                              Momo
                            </div>
                            <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-orange-500 rounded flex items-center justify-center text-white text-[8px] font-bold">
                              ZPay
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Card>

            {/* Category Breakdown */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[#0A4A6E]" />
                <h2 className="text-xl font-bold text-[#0A4A6E]">PHÂN LOẠI CHI PHÍ</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(transactionsByCategory).map(([category, items]) => {
                  const total = items.reduce((sum, t) => sum + t.amount, 0);
                  const percentage = (total / totalSpent) * 100;
                  
                  return (
                    <div key={category} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1 font-medium">{category}</p>
                      <p className="text-2xl font-bold text-[#0A4A6E] mb-2">{formatVND(total)}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="flex-1 h-2 bg-slate-200" />
                        <span className="text-xs text-slate-500 font-semibold">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Transactions List - LỊCH SỬ GIAO DỊCH */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#0A4A6E]" />
                  <h2 className="text-xl font-bold text-[#0A4A6E]">LỊCH SỬ GIAO DỊCH</h2>
                </div>
                <Badge className="bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20">
                  {transactions.length} giao dịch
                </Badge>
              </div>

              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const payer = users.find((u) => u.id === transaction.paidBy);
                  if (!payer) return null;

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl hover:shadow-md transition-all border border-slate-100"
                    >
                      <Avatar className="w-10 h-10 ring-2 ring-slate-200">
                        <AvatarImage src={payer.avatar} />
                        <AvatarFallback>{payer.name[0]}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 mb-1">{transaction.description}</p>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span>Thanh toán bởi {payer.name}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs border-[#0A4A6E] text-[#0A4A6E]">
                            {transaction.category}
                          </Badge>
                          {transaction.linkedActivity && (
                            <>
                              <span>•</span>
                              <span className="text-xs">Liên kết hoạt động</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-[#0A4A6E]">{formatVND(transaction.amount)}</p>
                        <p className="text-xs text-slate-500">Chia {transaction.splitAmong.length} người</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <Button
          size="lg"
          className="rounded-full shadow-2xl bg-[#FF6B35] hover:bg-[#ff7d4d] h-16 w-16 p-0"
        >
          <Plus className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );
}
