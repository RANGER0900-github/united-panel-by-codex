import React, { useState } from "react";
import { useLocation } from "wouter";
import { api, setToken } from "@/api/client";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await api.post("/api/auth/login", { username, password });
      const token = response.data?.data?.token;
      if (!token) {
        setError("Login failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
      setToken(token);
      setLocation("/");
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Login failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass-card rounded-2xl w-full max-w-md p-8 border border-primary/20 shadow-[0_0_30px_rgba(0,212,255,0.15)]">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 text-center">
          VPS Panel Login
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-8">
          Authenticate to access the control plane.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            className="form-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="form-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,212,255,0.35)] hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
