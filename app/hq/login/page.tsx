import Link from "next/link";
import styles from "./login.module.css";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function HqLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error =
    params.error === "invalid"
      ? "That password was not recognized."
      : params.error === "config"
        ? "Agent HQ access has not been configured yet."
        : null;
  const destination =
    params.next?.startsWith("/hq") && !params.next.startsWith("//")
      ? params.next
      : "/hq";

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand}>
        <span>SS</span>
        STREAM STARTERS
      </Link>
      <section className={styles.loginPanel}>
        <div className={styles.pixelLock} aria-hidden="true">
          <span />
        </div>
        <p className={styles.eyebrow}>PRIVATE WORKSPACE</p>
        <h1>Agent HQ</h1>
        <p className={styles.intro}>
          Enter your private access password to open the team room.
        </p>
        <form action="/api/hq-login" method="post">
          <input type="hidden" name="next" value={destination} />
          <label htmlFor="hq-password">Password</label>
          <input
            id="hq-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
          />
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="submit">Enter Agent HQ →</button>
        </form>
        <p className={styles.note}>Seven-day private session · Sign out anytime</p>
      </section>
    </main>
  );
}
