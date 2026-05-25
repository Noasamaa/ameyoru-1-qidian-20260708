import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";

export default async function HomePage() {
  await requireSession();
  redirect("/overview");
}
