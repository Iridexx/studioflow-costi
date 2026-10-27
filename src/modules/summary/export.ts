import ExcelJS from "exceljs";
import { RECURRENCE_LABEL } from "@/lib/labels";
import { listContributions } from "@/modules/contributions/service";
import { listExpenses, listUnapprovedExpenses } from "@/modules/expenses/service";
import { splitLabel } from "@/modules/expenses/split";
import { listPartners } from "@/modules/partners/service";
import {
  charges,
  fixedMonthlyCost,
  forecast,
  hoursByPartner,
  partnerBalances,
  pendingExpensesTotal,
  settlements,
  timeValueCents,
} from "@/modules/summary/calc";
import { listAllTimeEntries } from "@/modules/time/service";

const EURO = '#,##0.00 "€"';
const DATE = "dd/mm/yyyy";
const eur = (cents: number) => cents / 100;

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: { header: string; key: string; width: number; style?: Partial<ExcelJS.Style> }[],
) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

// Tutti i dati in un file Excel, per il commercialista o per un archivio.
export async function buildWorkbook(today: Date): Promise<ExcelJS.Workbook> {
  const [expenses, unapproved, partners, contributions, entries] = await Promise.all([
    listExpenses(),
    listUnapprovedExpenses(),
    listPartners(),
    listContributions(),
    listAllTimeEntries(),
  ]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StudioFlow Costi";

  const summary = partnerBalances(partners, expenses, contributions, today);
  const totals = addSheet(workbook, "Riepilogo", [
    { header: "Voce", key: "label", width: 40 },
    { header: "Valore", key: "value", width: 18, style: { numFmt: EURO } },
  ]);
  const pending = pendingExpensesTotal(unapproved);
  const hours = hoursByPartner(partners, entries);
  totals.addRows([
    { label: "Speso dall'inizio a oggi", value: eur(summary.spentCents) },
    { label: "Costi fissi al mese", value: eur(fixedMonthlyCost(expenses, today)) },
    { label: "Previsione prossimi 12 mesi", value: eur(forecast(expenses, today)) },
    { label: `Spese da approvare (${pending.count})`, value: eur(pending.cents) },
    { label: "Costo ore confermate", value: eur(hours.total.confirmedCents) },
    { label: "Costo ore da confermare", value: eur(hours.total.pendingCents) },
    {
      label: "Spese più ore confermate",
      value: eur(summary.spentCents + hours.total.confirmedCents),
    },
    { label: "Cassa comune", value: eur(summary.cashCents) },
  ]);
  totals.addRow({});
  totals.addRow({ label: "Costo ore per socio (confermate / da confermare)" }).font = {
    bold: true,
  };
  for (const r of hours.rows) {
    totals.addRow({ label: `${r.partner.name}, confermate`, value: eur(r.confirmedCents) });
    if (r.pendingCents > 0)
      totals.addRow({ label: `${r.partner.name}, da confermare`, value: eur(r.pendingCents) });
  }
  totals.addRow({});
  totals.addRow({ label: "Saldo tra soci" }).font = { bold: true };
  for (const b of summary.balances)
    totals.addRow({ label: b.partner.name, value: eur(b.balanceCents) });
  for (const t of settlements(summary.balances))
    totals.addRow({ label: `${t.from.name} deve dare a ${t.to.name}`, value: eur(t.cents) });

  const chargeSheet = addSheet(workbook, "Addebiti fino a oggi", [
    { header: "Data", key: "date", width: 12, style: { numFmt: DATE } },
    { header: "Descrizione", key: "description", width: 40 },
    { header: "Fornitore", key: "supplier", width: 20 },
    { header: "Categoria", key: "category", width: 28 },
    { header: "Importo (IVA incl.)", key: "amount", width: 16, style: { numFmt: EURO } },
    { header: "Imponibile", key: "net", width: 14, style: { numFmt: EURO } },
    { header: "Pagata da", key: "paidBy", width: 18 },
  ]);
  for (const c of charges(expenses, new Date(Date.UTC(1970, 0, 1)), today)) {
    const e = c.expense;
    chargeSheet.addRow({
      date: c.date,
      description: e.description,
      supplier: e.supplier ?? "",
      category: e.category.name,
      amount: eur(e.amountCents),
      net: eur(Math.round((e.amountCents * 10000) / (10000 + e.vatBasisPoints))),
      paidBy: e.paidBy?.name ?? "Cassa comune",
    });
  }

  const expenseSheet = addSheet(workbook, "Voci di spesa", [
    { header: "Data / primo addebito", key: "date", width: 14, style: { numFmt: DATE } },
    { header: "Fine", key: "endDate", width: 12, style: { numFmt: DATE } },
    { header: "Descrizione", key: "description", width: 40 },
    { header: "Fornitore", key: "supplier", width: 20 },
    { header: "Categoria", key: "category", width: 28 },
    { header: "Ricorrenza", key: "recurrence", width: 12 },
    { header: "Importo (IVA incl.)", key: "amount", width: 16, style: { numFmt: EURO } },
    { header: "IVA %", key: "vat", width: 8 },
    { header: "Pagata da", key: "paidBy", width: 18 },
    { header: "A carico di", key: "split", width: 28 },
    { header: "Note", key: "notes", width: 30 },
    { header: "Inserita da", key: "createdBy", width: 18 },
  ]);
  for (const e of expenses) {
    expenseSheet.addRow({
      date: e.date,
      endDate: e.endDate ?? undefined,
      description: e.description,
      supplier: e.supplier ?? "",
      category: e.category.name,
      recurrence: RECURRENCE_LABEL[e.recurrence],
      amount: eur(e.amountCents),
      vat: e.vatBasisPoints / 100,
      paidBy: e.paidBy?.name ?? "Cassa comune",
      split: splitLabel(e.partyBShareBasisPoints),
      notes: e.notes ?? "",
      createdBy: e.createdBy.name,
    });
  }

  const timeSheet = addSheet(workbook, "Ore", [
    { header: "Data", key: "date", width: 12, style: { numFmt: DATE } },
    { header: "Chi", key: "partner", width: 20 },
    { header: "Argomento", key: "topic", width: 28 },
    { header: "Ore", key: "hours", width: 8, style: { numFmt: "0.00" } },
    { header: "Costo orario", key: "rate", width: 12, style: { numFmt: EURO } },
    { header: "Valore", key: "value", width: 14, style: { numFmt: EURO } },
    { header: "Stato", key: "status", width: 14 },
    { header: "Note", key: "notes", width: 30 },
  ]);
  for (const t of entries) {
    timeSheet.addRow({
      date: t.date,
      partner: t.partner.name,
      topic: t.topic,
      hours: t.minutes / 60,
      rate: eur(t.hourlyRateCents),
      value: eur(timeValueCents(t)),
      status: t.approvedAt ? "Confermate" : "Da confermare",
      notes: t.notes ?? "",
    });
  }

  const contributionSheet = addSheet(workbook, "Versamenti", [
    { header: "Data", key: "date", width: 12, style: { numFmt: DATE } },
    { header: "Socio", key: "partner", width: 20 },
    { header: "Importo", key: "amount", width: 14, style: { numFmt: EURO } },
    { header: "Note", key: "notes", width: 30 },
  ]);
  for (const c of contributions) {
    contributionSheet.addRow({
      date: c.date,
      partner: c.partner.name,
      amount: eur(c.amountCents),
      notes: c.notes ?? "",
    });
  }
  return workbook;
}
