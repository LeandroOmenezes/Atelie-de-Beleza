import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sale } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, TrendingUp, CreditCard, Scissors, CalendarRange, UserRound } from "lucide-react";

type Period = "day" | "week" | "month" | "custom";

function localDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  pix: "PIX",
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "bg-green-500",
  credit: "bg-blue-500",
  debit: "bg-purple-500",
  pix: "bg-orange-500",
};

export default function FinancialReport() {
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState(localDateStr(-30));
  const [customEnd, setCustomEnd] = useState(localDateStr());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: allSales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    switch (period) {
      case "day":
        return { start: today, end: endOfToday };
      case "week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: endOfToday };
      }
      case "month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: endOfToday };
      }
      case "custom":
        return {
          start: new Date(customStart + "T00:00:00"),
          end: new Date(customEnd + "T23:59:59"),
        };
    }
  };

  const { start, end } = getDateRange();

  const filteredSales = allSales.filter((sale) => {
    const d = new Date(sale.date + "T00:00:00");
    return d >= start && d <= end;
  });

  const activeSales = filteredSales.filter((s) => (s.status ?? "active") !== "cancelled");
  const cancelledSales = filteredSales.filter((s) => (s.status ?? "active") === "cancelled");

  const totalRevenue = activeSales.reduce((t, s) => t + s.amount, 0);
  const avgSale = activeSales.length ? totalRevenue / activeSales.length : 0;

  // Breakdown por forma de pagamento
  const byPayment: Record<string, { total: number; count: number }> = {};
  for (const sale of activeSales) {
    if (!byPayment[sale.paymentMethod]) byPayment[sale.paymentMethod] = { total: 0, count: 0 };
    byPayment[sale.paymentMethod].total += sale.amount;
    byPayment[sale.paymentMethod].count += 1;
  }
  const paymentEntries = Object.entries(byPayment).sort((a, b) => b[1].total - a[1].total);

  // Breakdown por serviço
  const byService: Record<string, { total: number; count: number }> = {};
  for (const sale of activeSales) {
    if (!byService[sale.serviceName]) byService[sale.serviceName] = { total: 0, count: 0 };
    byService[sale.serviceName].total += sale.amount;
    byService[sale.serviceName].count += 1;
  }
  const serviceEntries = Object.entries(byService).sort((a, b) => b[1].total - a[1].total);

  // Breakdown por categoria
  const byCategory: Record<string, { total: number; count: number }> = {};
  for (const sale of activeSales) {
    const cat = (sale as any).categoryName || "Sem categoria";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += sale.amount;
    byCategory[cat].count += 1;
  }
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);

  // Breakdown por profissional
  const byProfessional: Record<string, { total: number; count: number }> = {};
  for (const sale of activeSales) {
    const prof = (sale as any).professionalName || "Não informado";
    if (!byProfessional[prof]) byProfessional[prof] = { total: 0, count: 0 };
    byProfessional[prof].total += sale.amount;
    byProfessional[prof].count += 1;
  }
  const professionalEntries = Object.entries(byProfessional).sort((a, b) => b[1].total - a[1].total);

  const periodLabel = period === "day" ? "Hoje" : period === "week" ? "Esta Semana" : period === "month" ? "Este Mês" : `${customStart.split("-").reverse().join("/")} a ${customEnd.split("-").reverse().join("/")}`;

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const styles = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; background: white; }
      .report-header { text-align: center; margin-bottom: 28px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
      .report-header h1 { font-size: 22px; font-weight: 700; color: #111827; }
      .report-header p { font-size: 13px; color: #6b7280; margin-top: 4px; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
      .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
      .summary-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px; }
      .summary-card .value { font-size: 20px; font-weight: 700; color: #111827; }
      .summary-card .sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
      .section { margin-bottom: 24px; }
      .section h2 { font-size: 14px; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f9fafb; text-align: left; padding: 8px 10px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
      td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
      tr:last-child td { border-bottom: none; }
      .cancelled-row td { color: #9ca3af; text-decoration: line-through; }
      .badge-cancelled { display: inline-block; background: #fee2e2; color: #dc2626; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 9999px; }
      .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12px; }
      .bar-label { width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bar-track { flex: 1; background: #f3f4f6; border-radius: 4px; height: 10px; overflow: hidden; }
      .bar-fill { height: 100%; background: #7c3aed; border-radius: 4px; }
      .bar-amount { width: 80px; text-align: right; font-weight: 600; }
      .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; font-size: 10px; color: #9ca3af; }
      @media print { body { padding: 20px; } }
    `;

    const esc = (str: string) =>
      String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    const formatDate = (dateString: string) =>
      new Date(dateString + "T00:00:00").toLocaleDateString("pt-BR");

    const getPaymentName = (m: string) => PAYMENT_LABELS[m] || esc(m);

    const maxService = serviceEntries[0]?.[1].total || 1;
    const maxPayment = paymentEntries[0]?.[1].total || 1;
    const maxCategory = categoryEntries[0]?.[1].total || 1;
    const maxProfessional = professionalEntries[0]?.[1].total || 1;

    const transactionRows = filteredSales.map(sale => {
      const cancelled = (sale.status ?? "active") === "cancelled";
      const prof = esc((sale as any).professionalName || "—");
      return `<tr class="${cancelled ? "cancelled-row" : ""}">
        <td>${esc(formatDate(sale.date))}</td>
        <td>${esc(sale.clientName)}</td>
        <td>${esc(sale.serviceName)}</td>
        <td>${prof}</td>
        <td>R$ ${sale.amount.toFixed(2)}</td>
        <td>${getPaymentName(sale.paymentMethod)}</td>
        <td>${esc(sale.notes || "—")}</td>
        <td>${cancelled ? '<span class="badge-cancelled">Cancelada</span>' : "Ativa"}</td>
      </tr>`;
    }).join("");

    const serviceRows = serviceEntries.map(([name, { total, count }]) => {
      const pct = Math.round((total / maxService) * 100);
      return `<div class="bar-row">
        <div class="bar-label" title="${esc(name)}">${esc(name)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="bar-amount">R$ ${total.toFixed(2)}</div>
        <div style="width:40px;text-align:right;color:#9ca3af;font-size:11px">${count}x</div>
      </div>`;
    }).join("");

    const paymentRows = paymentEntries.map(([method, { total, count }]) => {
      const pct = Math.round((total / maxPayment) * 100);
      const pctOfTotal = totalRevenue ? ((total / totalRevenue) * 100).toFixed(1) : "0";
      return `<div class="bar-row">
        <div class="bar-label">${getPaymentName(method)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#059669"></div></div>
        <div class="bar-amount">R$ ${total.toFixed(2)}</div>
        <div style="width:50px;text-align:right;color:#9ca3af;font-size:11px">${pctOfTotal}% · ${count}x</div>
      </div>`;
    }).join("");

    const categoryRows = categoryEntries.map(([name, { total, count }]) => {
      const pct = Math.round((total / maxCategory) * 100);
      return `<div class="bar-row">
        <div class="bar-label" title="${esc(name)}">${esc(name)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#d97706"></div></div>
        <div class="bar-amount">R$ ${total.toFixed(2)}</div>
        <div style="width:40px;text-align:right;color:#9ca3af;font-size:11px">${count}x</div>
      </div>`;
    }).join("");

    const professionalRows = professionalEntries.map(([name, { total, count }]) => {
      const pct = Math.round((total / maxProfessional) * 100);
      const pctOfTotal = totalRevenue ? ((total / totalRevenue) * 100).toFixed(1) : "0";
      return `<div class="bar-row">
        <div class="bar-label" title="${esc(name)}">${esc(name)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#7c3aed"></div></div>
        <div class="bar-amount">R$ ${total.toFixed(2)}</div>
        <div style="width:50px;text-align:right;color:#9ca3af;font-size:11px">${pctOfTotal}% · ${count}x</div>
      </div>`;
    }).join("");

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Relatório Financeiro</title><style>${styles}</style></head>
<body>
  <div class="report-header">
    <h1>Relatório Financeiro</h1>
    <p>Período: ${periodLabel} &nbsp;|&nbsp; Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Receita Total</div>
      <div class="value">R$ ${totalRevenue.toFixed(2)}</div>
      <div class="sub">vendas ativas</div>
    </div>
    <div class="summary-card">
      <div class="label">Vendas Ativas</div>
      <div class="value">${activeSales.length}</div>
      <div class="sub">${cancelledSales.length} cancelada(s)</div>
    </div>
    <div class="summary-card">
      <div class="label">Ticket Médio</div>
      <div class="value">R$ ${avgSale.toFixed(2)}</div>
      <div class="sub">por venda</div>
    </div>
    <div class="summary-card">
      <div class="label">Serviços Distintos</div>
      <div class="value">${serviceEntries.length}</div>
      <div class="sub">no período</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
    <div class="section">
      <h2>Receita por Serviço</h2>
      ${serviceRows || "<p style='color:#9ca3af;font-size:12px'>Nenhum dado no período.</p>"}
    </div>
    <div class="section">
      <h2>Receita por Forma de Pagamento</h2>
      ${paymentRows || "<p style='color:#9ca3af;font-size:12px'>Nenhum dado no período.</p>"}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
    <div class="section">
      <h2>Receita por Categoria</h2>
      ${categoryRows || "<p style='color:#9ca3af;font-size:12px'>Nenhum dado no período.</p>"}
    </div>
    <div class="section">
      <h2>Receita por Profissional</h2>
      ${professionalRows || "<p style='color:#9ca3af;font-size:12px'>Nenhum dado no período.</p>"}
    </div>
  </div>

  <div class="section">
    <h2>Todas as Transações</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Valor</th><th>Pagamento</th><th>Observações</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${transactionRows || '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:20px">Nenhuma venda no período.</td></tr>'}</tbody>
    </table>
  </div>

  <div class="footer">Ateliê de Beleza — Relatório gerado automaticamente pelo sistema</div>
</body></html>`);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }

  const periodButtonClass = (p: Period) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${period === p ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`;

  return (
    <div ref={printRef}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <button className={periodButtonClass("day")} onClick={() => setPeriod("day")}>Hoje</button>
          <button className={periodButtonClass("week")} onClick={() => setPeriod("week")}>Semana</button>
          <button className={periodButtonClass("month")} onClick={() => setPeriod("month")}>Mês</button>
          <button className={periodButtonClass("custom")} onClick={() => setPeriod("custom")}>Personalizado</button>
        </div>
        <div className="ml-auto">
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer size={16} />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="space-y-1">
            <Label>Data inicial</Label>
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>Data final</Label>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-40" />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando dados...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receita Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">vendas ativas</p>
            </div>
            <div className="bg-gray-50 border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarRange size={16} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{activeSales.length}</p>
              {cancelledSales.length > 0 && (
                <p className="text-xs text-red-400 mt-1">{cancelledSales.length} cancelada(s)</p>
              )}
            </div>
            <div className="bg-gray-50 border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={16} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket Médio</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">R$ {avgSale.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">por venda</p>
            </div>
            <div className="bg-gray-50 border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scissors size={16} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviços</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{serviceEntries.length}</p>
              <p className="text-xs text-gray-400 mt-1">distintos no período</p>
            </div>
          </div>

          {activeSales.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border rounded-xl bg-gray-50">
              Nenhuma venda encontrada no período selecionado.
            </div>
          ) : (
            <>
              {/* Breakdowns — row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Por serviço */}
                <div className="border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Scissors size={15} className="text-primary" />
                    Receita por Serviço
                  </h3>
                  <div className="space-y-3">
                    {serviceEntries.map(([name, { total, count }]) => {
                      const maxVal = serviceEntries[0][1].total;
                      const pct = Math.round((total / maxVal) * 100);
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span className="font-medium truncate max-w-[180px]" title={name}>{name}</span>
                            <span className="shrink-0 ml-2 font-semibold">R$ {total.toFixed(2)} <span className="text-gray-400 font-normal">({count}x)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Por forma de pagamento */}
                <div className="border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <CreditCard size={15} className="text-primary" />
                    Receita por Forma de Pagamento
                  </h3>
                  <div className="space-y-3">
                    {paymentEntries.map(([method, { total, count }]) => {
                      const maxVal = paymentEntries[0][1].total;
                      const pct = Math.round((total / maxVal) * 100);
                      const pctOfTotal = totalRevenue ? ((total / totalRevenue) * 100).toFixed(1) : "0";
                      const colorClass = PAYMENT_COLORS[method] || "bg-gray-500";
                      return (
                        <div key={method}>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span className="font-medium flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                              {PAYMENT_LABELS[method] || method}
                            </span>
                            <span className="shrink-0 ml-2 font-semibold">
                              R$ {total.toFixed(2)} <span className="text-gray-400 font-normal">({pctOfTotal}% · {count}x)</span>
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Breakdowns — row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Por categoria */}
                <div className="border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <TrendingUp size={15} className="text-amber-500" />
                    Receita por Categoria
                  </h3>
                  {categoryEntries.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum dado no período.</p>
                  ) : (
                    <div className="space-y-3">
                      {categoryEntries.map(([name, { total, count }]) => {
                        const maxVal = categoryEntries[0][1].total;
                        const pct = Math.round((total / maxVal) * 100);
                        const pctOfTotal = totalRevenue ? ((total / totalRevenue) * 100).toFixed(1) : "0";
                        return (
                          <div key={name}>
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span className="font-medium truncate max-w-[180px]" title={name}>{name}</span>
                              <span className="shrink-0 ml-2 font-semibold">R$ {total.toFixed(2)} <span className="text-gray-400 font-normal">({pctOfTotal}% · {count}x)</span></span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Por profissional */}
                <div className="border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <UserRound size={15} className="text-violet-500" />
                    Receita por Profissional
                  </h3>
                  {professionalEntries.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhuma venda no período.</p>
                  ) : (
                    <div className="space-y-3">
                      {professionalEntries.map(([name, { total, count }]) => {
                        const maxVal = professionalEntries[0][1].total;
                        const pct = Math.round((total / maxVal) * 100);
                        const pctOfTotal = totalRevenue ? ((total / totalRevenue) * 100).toFixed(1) : "0";
                        const isUnknown = name === "Não informado";
                        return (
                          <div key={name}>
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span className={`font-medium truncate max-w-[180px] ${isUnknown ? "text-gray-400 italic" : ""}`} title={name}>{name}</span>
                              <span className="shrink-0 ml-2 font-semibold">R$ {total.toFixed(2)} <span className="text-gray-400 font-normal">({pctOfTotal}% · {count}x)</span></span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${isUnknown ? "bg-gray-300" : "bg-violet-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Transactions table */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b">
                  <h3 className="text-sm font-bold text-gray-700">Todas as Transações — {periodLabel}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviço</th>
                        <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagamento</th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Observações</th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSales.map((sale) => {
                        const cancelled = (sale.status ?? "active") === "cancelled";
                        return (
                          <tr key={sale.id} className={cancelled ? "opacity-50 bg-red-50" : "hover:bg-gray-50"}>
                            <td className={`py-3 px-4 text-gray-600 ${cancelled ? "line-through" : ""}`}>
                              {new Date(sale.date + "T00:00:00").toLocaleDateString("pt-BR")}
                            </td>
                            <td className={`py-3 px-4 text-gray-700 font-medium ${cancelled ? "line-through" : ""}`}>{sale.clientName}</td>
                            <td className={`py-3 px-4 text-gray-600 ${cancelled ? "line-through" : ""}`}>{sale.serviceName}</td>
                            <td className={`py-3 px-4 text-right font-semibold ${cancelled ? "line-through text-gray-400" : "text-gray-800"}`}>
                              R$ {sale.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                sale.paymentMethod === "pix" ? "bg-orange-100 text-orange-700" :
                                sale.paymentMethod === "cash" ? "bg-green-100 text-green-700" :
                                sale.paymentMethod === "credit" ? "bg-blue-100 text-blue-700" :
                                "bg-purple-100 text-purple-700"
                              }`}>
                                {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs max-w-[140px] truncate" title={sale.notes ?? ""}>
                              {sale.notes || "—"}
                            </td>
                            <td className="py-3 px-4">
                              {cancelled ? (
                                <span className="inline-flex text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Cancelada</span>
                              ) : (
                                <span className="inline-flex text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Ativa</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
