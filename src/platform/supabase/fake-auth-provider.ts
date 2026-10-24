import { randomUUID } from "node:crypto";
import {
  samePassword,
  type AuthProvider,
  type AuthUser,
  type SignOutScope,
} from "./auth-provider";

type Account = AuthUser & { password: string; sessions: Set<string> };

/**
 * Provedor de login em memória, só para testes. Cada instância representa um aparelho:
 * `device()` cria outro aparelho que enxerga as mesmas contas.
 */
export class FakeAuthProvider implements AuthProvider {
  private current: { userId: string; sessionId: string } | null = null;

  constructor(private readonly accounts = new Map<string, Account>()) {}

  device(): FakeAuthProvider {
    return new FakeAuthProvider(this.accounts);
  }

  async signInWithPassword(email: string, password: string) {
    const account = [...this.accounts.values()].find(
      (a) => a.email === email.toLowerCase(),
    );
    if (!account || account.password !== password) return null;
    const sessionId = randomUUID();
    account.sessions.add(sessionId);
    this.current = { userId: account.id, sessionId };
    return { id: account.id, email: account.email };
  }

  async verifyPassword(email: string, password: string) {
    const account = [...this.accounts.values()].find(
      (a) => a.email === email.toLowerCase(),
    );
    return account?.password === password;
  }

  async getUser() {
    if (!this.current) return null;
    const account = this.accounts.get(this.current.userId);
    if (!account?.sessions.has(this.current.sessionId)) return null;
    return { id: account.id, email: account.email };
  }

  async signOut(scope: SignOutScope) {
    if (!this.current) return;
    const account = this.accounts.get(this.current.userId);
    if (account) {
      if (scope === "local") account.sessions.delete(this.current.sessionId);
      if (scope === "others")
        account.sessions = new Set([this.current.sessionId]);
      if (scope === "global") account.sessions.clear();
    }
    if (scope !== "others") this.current = null;
  }

  async updateOwnPassword(password: string) {
    const user = await this.getUser();
    if (!user) throw new Error("Sem sessão");
    const account = this.accounts.get(user.id)!;
    if (account.password === password) throw samePassword();
    account.password = password;
  }

  async adminUpdatePassword(userId: string, password: string) {
    const account = this.accounts.get(userId);
    if (!account) throw new Error("Usuário não encontrado");
    account.password = password;
  }

  async adminSignOutAll(userId: string) {
    this.accounts.get(userId)?.sessions.clear();
  }

  async adminCreateUser(email: string, password: string) {
    const id = randomUUID();
    this.accounts.set(id, {
      id,
      email: email.toLowerCase(),
      password,
      sessions: new Set(),
    });
    return { id, email: email.toLowerCase() };
  }
}
