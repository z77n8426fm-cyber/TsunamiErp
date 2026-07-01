import { redirect } from "next/navigation";

/** La raíz del sitio redirige al dashboard (el middleware exige sesión). */
export default function Home() {
  redirect("/dashboard");
}
