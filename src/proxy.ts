import { NextResponse, type NextRequest } from "next/server";
import { partnerFromToken, SESSION_COOKIE } from "@/lib/session";
import { CHANGE_PASSWORD_PATH, passwordGate } from "@/modules/auth/password-gate";

// Prima di ogni richiesta: chi ha ancora la password provvisoria va al cambio password, da
// qualunque pagina arrivi (link diretti, menu, pagine già aperte) e non può usare azioni o download.
// Pagine e azioni controllano comunque da sole l'accesso con requirePartner().
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();
  const partner = await partnerFromToken(token);
  const decision = passwordGate(
    request.nextUrl.pathname,
    request.method,
    !!partner?.mustChangePassword,
  );
  if (decision === "pass") return NextResponse.next();
  if (decision === "redirect")
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, request.url));
  return new Response("Prima di continuare cambia la password provvisoria.", { status: 403 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
