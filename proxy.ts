import { NextResponse, type NextRequest } from "next/server";

// Opening /edit/<editId> marks this browser as the quote's editor, so the
// freelancer previewing the client link doesn't flip the status to "Viewed".
export function proxy(request: NextRequest) {
  const editId = request.nextUrl.pathname.split("/")[2];
  const res = NextResponse.next();
  if (editId) {
    res.cookies.set(`ql_editor_${editId}`, "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}

export const config = { matcher: "/edit/:editId" };
