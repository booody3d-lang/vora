import { NextResponse } from "next/server";
import {
  getUploadContentType,
  readUploadedFile,
} from "@/lib/profile/profile-store";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { path } = await params;
  if (!path || path.length < 2) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [accountId, ...rest] = path;
  const filename = rest.join("/");
  const buffer = readUploadedFile(accountId, filename);
  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": getUploadContentType(filename),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
