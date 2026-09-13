import { useState } from "react";
import type React from "react";
import { LockKeyhole, Store, UserPlus, LogIn } from "lucide-react";
import { api } from "../services/api";
import { Role, ROLE_LABELS, User } from "../types";

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [login, setLogin] = useState({ identifier: "rajaharoon320@gmail.com", password: "12345678" });
  const [signup, setSignup] = useState({ name: "", username: "", email: "", phone: "", role: "sales_agent", password: "", confirmPassword: "" });

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice("");
    try { const result = await api.login(login.identifier, login.password); await onAuthenticated(result.user); }
    catch (error: any) { setNotice(error.message); } finally { setBusy(false); }
  };
  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault(); if (signup.password !== signup.confirmPassword) return setNotice("Passwords do not match.");
    setBusy(true); setNotice("");
    try { const result = await api.signup(signup); setNotice(result.message); setMode("login"); }
    catch (error: any) { setNotice(error.message); } finally { setBusy(false); }
  };
  const requestedRoles: Role[] = ["manager", "warehouse_manager", "cashier", "salesperson", "sales_agent"];
  return <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
    <section className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-white shadow-2xl">
      <div className="bg-neutral-900 px-7 py-7 text-white"><div className="flex items-center gap-3"><Store className="w-8 h-8 text-emerald-400" /><div><h1 className="text-xl font-black">Apex Retail POS</h1><p className="text-xs text-neutral-400">Secure staff portal sign-in</p></div></div></div>
      <div className="p-7"><div className="mb-5 grid grid-cols-2 rounded-xl bg-neutral-100 p-1"><button onClick={() => setMode("login")} className={`rounded-lg py-2 text-xs font-bold ${mode === "login" ? "bg-white shadow text-neutral-900" : "text-neutral-500"}`}>Login</button><button onClick={() => setMode("signup")} className={`rounded-lg py-2 text-xs font-bold ${mode === "signup" ? "bg-white shadow text-neutral-900" : "text-neutral-500"}`}>Sign up</button></div>
      {notice && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">{notice}</p>}
      {mode === "login" ? <form onSubmit={submitLogin} className="space-y-4"><label className="block text-xs font-bold">Email or username<input required value={login.identifier} onChange={e => setLogin({ ...login, identifier: e.target.value })} className="mt-1.5 w-full rounded-xl border p-3 text-sm" /></label><label className="block text-xs font-bold">Password<input required type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} className="mt-1.5 w-full rounded-xl border p-3 text-sm" /></label><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white disabled:opacity-50"><LogIn className="w-4 h-4" />{busy ? "Signing in…" : "Login to portal"}</button></form> : <form onSubmit={submitSignup} className="space-y-3"><input required placeholder="Full name" value={signup.name} onChange={e => setSignup({ ...signup, name: e.target.value })} className="w-full rounded-xl border p-3 text-sm" /><input required placeholder="Username" value={signup.username} onChange={e => setSignup({ ...signup, username: e.target.value })} className="w-full rounded-xl border p-3 text-sm" /><input required type="email" placeholder="Email" value={signup.email} onChange={e => setSignup({ ...signup, email: e.target.value })} className="w-full rounded-xl border p-3 text-sm" /><input placeholder="Mobile number" value={signup.phone} onChange={e => setSignup({ ...signup, phone: e.target.value })} className="w-full rounded-xl border p-3 text-sm" /><select value={signup.role} onChange={e => setSignup({ ...signup, role: e.target.value })} className="w-full rounded-xl border p-3 text-sm">{requestedRoles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><input required minLength={8} type="password" placeholder="Password (8+ characters)" value={signup.password} onChange={e => setSignup({ ...signup, password: e.target.value })} className="w-full rounded-xl border p-3 text-sm" /><input required type="password" placeholder="Confirm password" value={signup.confirmPassword} onChange={e => setSignup({ ...signup, confirmPassword: e.target.value })} className="w-full rounded-xl border p-3 text-sm" /><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white disabled:opacity-50"><UserPlus className="w-4 h-4" />{busy ? "Submitting…" : "Request staff account"}</button></form>}
      <p className="mt-5 flex items-center gap-1.5 text-[11px] text-neutral-500"><LockKeyhole className="w-3.5 h-3.5" />New registrations require admin activation.</p></div>
    </section></main>;
}
