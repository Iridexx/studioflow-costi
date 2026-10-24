import { dayInput, todayDay } from "@/lib/format";
import { getCurrentPartner } from "@/lib/session";
import { buildWorkbook } from "@/modules/summary/export";

export async function GET() {
  if (!(await getCurrentPartner())) return new Response("Accesso richiesto", { status: 401 });
  const today = todayDay();
  const workbook = await buildWorkbook(today);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="studioflow-costi-${dayInput(today)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
