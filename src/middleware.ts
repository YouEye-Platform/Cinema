import { createCanvasMiddleware } from "@/lib/middleware";
import { initSession } from "@/lib/auth";

initSession("ye-cinema");

export const middleware = createCanvasMiddleware({
  appId: "ye-cinema",
  publicRoutes: ["/api/shared/", "/shared/", "/embed/card/", "/embed/timeline/", "/embed/widget/"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
