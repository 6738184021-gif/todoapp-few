"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getTaskTitleError } from "@/lib/task-utils";
import styles from "./page.module.css";

type Task = {
  id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
};

type TaskFilter = "all" | "active" | "completed";

function Icon({
  name,
  size = 18,
}: {
  name: "check" | "plus" | "trash" | "logout" | "spark" | "arrow";
  size?: number;
}) {
  const paths = {
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2m3 0-1 14H6L5 6" />
        <path d="M10 11v5m4-5v5" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1 1-2.5Z" />
      </>
    ),
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function Home() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskError, setTaskError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError("");
      setAuthMessage("");
      setTaskError("");
      setTasks([]);
      setTasksLoading(Boolean(nextSession?.user));
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user) return;

    const client = supabase;
    let active = true;
    async function fetchTasks() {
      const { data, error } = await client
        .from("tasks")
        .select("id, title, is_complete, created_at")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        setTaskError(`We couldn’t load your tasks. ${error.message}`);
        setTasks([]);
      } else {
        setTasks(data ?? []);
      }
      setTasksLoading(false);
    }

    void fetchTasks();
    return () => {
      active = false;
    };
  }, [session?.user, supabase]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.is_complete;
    if (filter === "completed") return task.is_complete;
    return true;
  });
  const completedCount = tasks.filter((task) => task.is_complete).length;
  const remainingCount = tasks.length - completedCount;
  const greetingName = session?.user.email?.split("@")[0] ?? "friend";

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setAuthMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setAuthError("Enter your email and password to continue.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Your password must be at least 6 characters.");
      return;
    }

    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
          })
        : await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

    if (result.error) {
      setAuthError(result.error.message);
      return;
    }
    if (authMode === "signup" && !result.data.session) {
      setAuthMessage(
        "Your account was created. Check your email to confirm it, then sign in.",
      );
      setAuthMode("signin");
      setPassword("");
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(`We couldn’t sign you out. ${error.message}`);
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session?.user) return;

    const validationError = getTaskTitleError(taskTitle);
    if (validationError) {
      setTaskError(validationError);
      return;
    }

    setAddingTask(true);
    setTaskError("");
    setNotice("");
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title: taskTitle.trim(), user_id: session.user.id })
      .select("id, title, is_complete, created_at")
      .single();

    if (error) {
      setTaskError(`We couldn’t add that task. ${error.message}`);
    } else {
      setTasks((current) => [data, ...current]);
      setTaskTitle("");
      setNotice("Task added.");
    }
    setAddingTask(false);
  }

  async function handleToggleTask(task: Task) {
    if (!supabase || !session?.user) return;
    setPendingTaskIds((current) => new Set(current).add(task.id));
    setTaskError("");
    setNotice("");
    const { data, error } = await supabase
      .from("tasks")
      .update({ is_complete: !task.is_complete })
      .eq("id", task.id)
      .eq("user_id", session.user.id)
      .select("id, title, is_complete, created_at")
      .single();

    if (error) {
      setTaskError(`We couldn’t update that task. ${error.message}`);
    } else {
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? data : item)),
      );
      setNotice(data.is_complete ? "Task completed." : "Task marked active.");
    }
    setPendingTaskIds((current) => {
      const next = new Set(current);
      next.delete(task.id);
      return next;
    });
  }

  async function handleDeleteTask(task: Task) {
    if (!supabase || !session?.user) return;
    setPendingTaskIds((current) => new Set(current).add(task.id));
    setTaskError("");
    setNotice("");
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", session.user.id);

    if (error) {
      setTaskError(`We couldn’t delete that task. ${error.message}`);
    } else {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setNotice("Task deleted.");
    }
    setPendingTaskIds((current) => {
      const next = new Set(current);
      next.delete(task.id);
      return next;
    });
  }

  if (authLoading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingMark}><Icon name="check" size={22} /></span>
        <p>Getting your space ready…</p>
      </main>
    );
  }

  if (!supabase) {
    return (
      <main className={styles.setupPage}>
        <section className={styles.setupCard}>
          <span className={styles.brandMark}><Icon name="check" size={21} /></span>
          <p className={styles.eyebrow}>ONE THING AT A TIME</p>
          <h1>Almost ready.</h1>
          <p>
            Add your Supabase project URL and public anon/publishable key to
            <code> .env.local</code>, then restart the dev server.
          </p>
          <pre>{`NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_ANON_KEY=`}</pre>
          <p className={styles.setupFootnote}>
            Never put a Supabase service-role key in a <code>NEXT_PUBLIC_</code>{" "}
            variable.
          </p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.authPage}>
        <div className={styles.authAside}>
          <div className={styles.authAsideContent}>
            <span className={styles.brandMark}><Icon name="check" size={21} /></span>
            <p className={styles.eyebrow}>A LITTLE MORE CLARITY</p>
            <h1>Make room for what matters.</h1>
            <p className={styles.asideCopy}>
              A calm place to collect your thoughts, make a plan, and move
              forward.
            </p>
            <div className={styles.asideNote}>
              <span className={styles.noteDot} />
              <span>Your tasks stay yours. Always.</span>
            </div>
          </div>
          <span className={styles.asideCredit}>Thoughtfully simple, by design.</span>
        </div>

        <section className={styles.authMain}>
          <div className={styles.authCard}>
            <div className={styles.mobileBrand}>
              <span className={styles.brandMark}><Icon name="check" size={21} /></span>
              <span>daymark</span>
            </div>
            <p className={styles.eyebrow}>
              {authMode === "signin" ? "WELCOME BACK" : "A FRESH START"}
            </p>
            <h2>{authMode === "signin" ? "Sign in to your space" : "Create your space"}</h2>
            <p className={styles.authIntro}>
              {authMode === "signin"
                ? "Pick up right where you left off."
                : "One small step toward a clearer day."}
            </p>

            <form className={styles.authForm} onSubmit={handleAuth}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
              {authError && <p className={styles.errorMessage} role="alert">{authError}</p>}
              {authMessage && <p className={styles.successMessage} role="status">{authMessage}</p>}
              <button className={styles.primaryButton} type="submit">
                {authMode === "signin" ? "Sign in" : "Create account"}
                <Icon name="arrow" size={16} />
              </button>
            </form>
            <p className={styles.authSwitch}>
              {authMode === "signin" ? "New around here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                {authMode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
            <p className={styles.privacyNote}>
              <Icon name="check" size={14} /> Protected by your private account
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Link className={styles.wordmark} href="/" aria-label="daymark home">
          <span className={styles.brandMark}><Icon name="check" size={19} /></span>
          <span>daymark<span className={styles.wordmarkDot}>.</span></span>
        </Link>
        <div className={styles.sidebarSection}>
          <p className={styles.sidebarLabel}>YOUR SPACE</p>
          <button className={`${styles.navItem} ${styles.navItemActive}`} type="button">
            <span className={styles.navIcon}><Icon name="check" size={16} /></span>
            My tasks
            <span className={styles.navCount}>{remainingCount}</span>
          </button>
        </div>
        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarQuote}>
            <span className={styles.quoteMark}>“</span>
            <p>Small steps every day add up to big change.</p>
            <span className={styles.quoteAuthor}>— James Clear</span>
          </div>
          <button className={styles.profileButton} type="button" onClick={handleSignOut}>
            <span className={styles.avatar}>{greetingName.slice(0, 1).toUpperCase()}</span>
            <span className={styles.profileInfo}>
              <strong>{greetingName}</strong>
              <span>Sign out</span>
            </span>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <span>My space</span><span className={styles.breadcrumbDivider}>/</span><strong>Tasks</strong>
          </div>
          <div className={styles.topbarRight}>
            <span className={styles.secureBadge}><span /> Private workspace</span>
            <span className={styles.avatarSmall}>{greetingName.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.dateLine}><Icon name="spark" size={16} /> TODAY · {formatDate(new Date()).toUpperCase()}</div>
          <div className={styles.headingRow}>
            <div>
              <h1>Your tasks<span className={styles.headingPeriod}>.</span></h1>
              <p className={styles.subtitle}>Good to see you, {greetingName}. Let’s make today count.</p>
            </div>
            <div className={styles.progressCard}>
              <span className={styles.progressIcon}><Icon name="check" size={15} /></span>
              <span><strong>{completedCount} of {tasks.length}</strong><small>tasks completed</small></span>
            </div>
          </div>

          <form className={styles.addTaskForm} onSubmit={handleAddTask}>
            <span className={styles.addTaskIcon}><Icon name="plus" size={19} /></span>
            <input
              aria-label="New task"
              maxLength={200}
              placeholder="What needs your attention?"
              value={taskTitle}
              onChange={(event) => {
                setTaskTitle(event.target.value);
                setTaskError("");
              }}
            />
            <span className={styles.addHint}>↵</span>
            <button type="submit" disabled={addingTask}>
              {addingTask ? "Adding…" : "Add task"}
            </button>
          </form>

          {taskError && <p className={styles.errorBanner} role="alert">{taskError}</p>}
          {notice && <p className={styles.successBanner} role="status">{notice}</p>}

          <div className={styles.listToolbar}>
            <div className={styles.filterTabs} role="tablist" aria-label="Filter tasks">
              {(["all", "active", "completed"] as const).map((item) => (
                <button
                  aria-selected={filter === item}
                  className={filter === item ? styles.filterActive : ""}
                  key={item}
                  onClick={() => setFilter(item)}
                  role="tab"
                  type="button"
                >
                  {item === "all" ? "All tasks" : item === "active" ? "In progress" : "Completed"}
                  {item === "all" && <span className={styles.filterCount}>{tasks.length}</span>}
                </button>
              ))}
            </div>
            <span className={styles.remainingText}>
              {remainingCount === 1 ? "1 task" : `${remainingCount} tasks`} to go
            </span>
          </div>

          {tasksLoading ? (
            <div className={styles.listMessage}>Gathering your tasks…</div>
          ) : filteredTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><Icon name="spark" size={23} /></span>
              <h2>{tasks.length === 0 ? "A fresh page." : "Nothing here for now."}</h2>
              <p>
                {tasks.length === 0
                  ? "Add your first task above. You’ve got this."
                  : "Try another filter, or enjoy the clear space."}
              </p>
            </div>
          ) : (
            <ul className={styles.taskList}>
              {filteredTasks.map((task) => {
                const pending = pendingTaskIds.has(task.id);
                return (
                  <li className={`${styles.taskRow} ${task.is_complete ? styles.taskCompleted : ""}`} key={task.id}>
                    <button
                      aria-label={task.is_complete ? `Mark ${task.title} active` : `Complete ${task.title}`}
                      aria-pressed={task.is_complete}
                      className={styles.checkButton}
                      disabled={pending}
                      onClick={() => void handleToggleTask(task)}
                      type="button"
                    >
                      {task.is_complete && <Icon name="check" size={14} />}
                    </button>
                    <span className={styles.taskTitle}>{task.title}</span>
                    {task.is_complete ? (
                      <span className={styles.completedTag}>Done</span>
                    ) : (
                      <span className={styles.taskStatus}><span /> In progress</span>
                    )}
                    <button
                      aria-label={`Delete ${task.title}`}
                      className={styles.deleteButton}
                      disabled={pending}
                      onClick={() => void handleDeleteTask(task)}
                      type="button"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <footer className={styles.listFooter}>
            <span><Icon name="check" size={14} /> Synced securely with Supabase</span>
            <span>{completedCount > 0 ? `${completedCount} done — nice work.` : "One step at a time."}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
