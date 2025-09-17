import { redirect } from "next/navigation";

export default function Page() {
  // Redirect the base route to the review list
  redirect("/admin/points-onboarding/list");
}
